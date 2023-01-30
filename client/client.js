//usuarios con permiso de eliminar (usuario y contraseña)
/*  Luis, l123
    Marco, m123
    Daniel, d123
*/
const {Socket} = require('net');
const readline = require('readline').createInterface({
    input:process.stdin,
    output:process.stdout,

});
var fs = require('fs');

const absolutePath = './files';
var dirLCD = absolutePath;



const ftp = (host, port, user, contrasena) =>{

    //var para GET
    var tempGet= false;
    var nombreArchivo = '';
    var packets = 0;
    var buffer = Buffer.alloc(0)
    var temp = false;
    var cantGets=0;
    var posGetActual = 0;

    const net = new Socket();
    net.connect({host, port});
    net.on('connect', () =>{
        console.log( "Conectado al servidor FTP!");
        direccion = net.remoteAddress;
        let info = 'OPEN^' + user + '@'+ host +'^-^'+ contrasena;
        net.write(info);
    })
    net.on('data', (data) =>{    
        if(tempGet){
            if(data !=  'No se encontro el archivo'){                
                if(data.toString().split('^')[0] == "fin") {
                    nombreArchivo = data.toString().split('^')[1]
                    tokens = data.toString().split("fin")
                    temp = true;
                }     
                packets++;                                
                if(temp == false){        
                    buffer = Buffer.concat([buffer, data]);
                }        
                //console.log(buffer.length); 
                var head = buffer.slice(0, 30);                    
                if(temp){
                    temp = false
                    var writeStream = fs.createWriteStream(dirLCD + '/'+ nombreArchivo);
                    var te = 0
                    while(buffer.length){
                        te ++;
                        //console.log(buffer.length)
                        var head = buffer.slice(0, 50);
                        //console.log(te)
                        if(head.toString().slice(0,4) != "FILE"){
                            console.log("ERROR!!!!" + head.toString().slice(0,20));
                            
                            buffer = Buffer.alloc(0)
                            posGetActual = posGetActual +1;
                            if(posGetActual <cantGets){
                                tempGet = true; 
                            }else{
                                tempGet = false;
                                posGetActual =0;
                            }
                            //process.exit(1);
                        }                        
                        var sizeHex = buffer.slice(4, 8);
                        var size = parseInt(sizeHex, 16);
                        var content = buffer.slice(8, size + 8);
                        var delimiter = buffer.slice(size + 8, size + 9);
                        //console.log("delimiter", delimiter.toString());
                        if(delimiter != "@"){
                            delimiter = buffer.slice(size + 61, size + 62);
                            //console.log("delimiter2 ", delimiter.toString());
                            if(delimiter == "@"){
                                size = size + 62 - 9
                                //console.log("Acomode el delimitador");                    
                            }
                            else{
                                content = Buffer.concat([content,buffer.slice(size,buffer.length)])
                                size = buffer.length
                            }                
                        }                        
                        writeStream.write(content);
                        buffer = buffer.slice(size + 9);                                            
                    }                                        
                    setTimeout(function(){
                        console.log("El archivo '" +  nombreArchivo + "' se copio exitosamente")
                        writeStream.close();
                        packets = 0;
                        buffer = Buffer.alloc(0)
                        //ya no se reciben mas paquetes para get
                        nombreArchivo = "";
                                               
                        posGetActual = posGetActual +1;
                        if(posGetActual <cantGets){
                            tempGet = true; 
                        }else{
                            tempGet = false;
                            posGetActual =0;
                        }
                    }, 2000);
                }                               
            }else{
                console.log(data.toString());
                posGetActual = posGetActual +1;
                if(posGetActual <cantGets){
                    tempGet = true; 
                }else{
                    tempGet = false;
                    posGetActual =0;
                }
            }
        }else{
            respuesta = data.toString('utf-8');
            tokens = respuesta.split('^')
            if(tokens[0] == 'LS'){
                paths = tokens[1].split(',');
                for(var i=0; i < paths.length; i++){
                    console.log('\t' + paths[i]);
                }
            }
            if(tokens[0] == 'CD'){
                console.log(tokens[1]);
            }
            if(tokens[0] == 'PUT'){
                console.log(tokens[1]);
            }
            if(tokens[0] == 'DELETE'){
                console.log(tokens[1]);
            }
            if(tokens[0] == 'PWD'){
                console.log(tokens[1]);
            }
        }                
    })    

    readline.on('line', (mensaje) =>{
        var linea = mensaje.split(" ");
        //console.log(linea);
        if(linea[0] == '?'){
            console.log("\t CLOSE \t- Cierra sesion");
            console.log("\t GET <archivo> \t- Bajar un archivo del servidor");
            console.log("\t PUT <archivo> \t- Subir un archivo al servidor");
            console.log("\t LCD <directorio> \t- Directorio local sobre el que vamos a trabajar");
            console.log("\t CD <directorio> \t- Moverse a traves de directorios del servidor");
            console.log("\t LS \t\t- Sacar  lista de directorios y archivos encontrados en el servidor");
            console.log("\t DELETE <archivo/s> \t- Eliminar archivos del servidor");
            console.log("\t MPUT <archivos> \t- Subir varios archivos al servidor");
            console.log("\t MGET <archivos> \t- Bajar varios archivos del servidor");
            console.log("\t RMDIR <nomDIR> \t- Borrar directorio vacio");
            console.log("\t PWD \t- Devuelve directorio del servidor en el que se encuentra");
        }
        else if(linea[0].toUpperCase()  == 'CLOSE'){            
            console.log("Sesion cerrada exitosamente!");
            net.write('CLOSE^' + user + '@' + host + '^-^');
        }
        else if(linea[0].toUpperCase()  == 'GET'){
            if(linea.length<=2){
                //nombreArchivo = linea[1];
                cantGets=linea.length - 1;  
                tempGet= true; 
                net.write('GET^' + user + '@' + host + '^'+ linea[1]);                
                console.log("Obteniendo archivo ...");                
            }else{
                console.log("Solo se puede obtener 1 archivo con GET!");
            }            
        }
        else if(linea[0].toUpperCase()  == 'PUT'){
            if(linea.length<=2){
                //subirArchivo(dirLCD + '/' + linea[1], linea[1] ,net);
                net.write("PUT^1");
                setTimeout(function(){
                    putArchivo(dirLCD + '/' + linea[1], net, linea[1])
                }, 4000);
                
            }else{
                console.log("Solo se puede subir 1 archivo con PUT!");
            }              
        }
        else if(linea[0].toUpperCase()  == 'LCD'){
            dirLCD = getLCD(absolutePath, linea[1]);            
        }
        else if(linea[0].toUpperCase()  == 'CD'){
            net.write('CD^' + user + '@' + host + '^'+ linea[1]);  
        }
        else if(linea[0].toUpperCase()  == 'LS'){
            console.log("Directorios y archivos encontrados:");
            net.write('LS^' + user + '@' + host + '^'+ linea[1]);            
        }
        else if(linea[0].toUpperCase()  == 'DELETE'){           
            var archs='';
            for(var i=1; i<linea.length; i++){                
                archs = archs + '^' + linea[i]; 
            } 
            net.write('DELETE^' + user + '@' + host+ archs);                       
        }
        else if(linea[0].toUpperCase()  == 'DELETE-R'){
            net.write('DELETE-R^' + user + '@' + host + '^'+ linea[1]);   
        }
        else if(linea[0].toUpperCase()  == 'MPUT'){ 
            cantPuts = linea.length -1
            net.write("PUT^"+ cantPuts);       
            for(var a = 1; a< linea.length; a++){
                temp1 = 'PUT^' + linea[a];
                putArchivo(dirLCD + '/' + linea[a], net, linea[a])
            }   
        }
        else if(linea[0].toUpperCase()  == 'MGET'){
            var archs='';
            cantGets=linea.length - 1;  
            tempGet= true;
            for(var i=1; i<linea.length; i++){                
                net.write('GET^' + user + '@' + host+ '^' + linea[i]);  
            }                      
        }
        else if(linea[0].toUpperCase()  == 'RMDIR'){
            net.write('RMDIR^' + user + '@' + host + '^'+ linea[1]);
        }
        else if(linea[0].toUpperCase()  == 'PWD'){
            net.write('PWD^' + user + '@' + host);
        }
        else{
            console.log("Comando desconocido, intentalo de nuevo! ('?' para ver lista de comandos)");
        }
    })
    net.on('close', () =>{
        console.log("Desconectado del servidor!");
        process.exit(0);
    })
    net.on('error', (err) => {
        console.log(err);
    })
}

const main = () => {
    if (process.argv.length != 4){
        console.log("node client usuario contrasena")
        process.exit(0);
    }
    let [ , , user, contrasena] = process.argv;
    var host = 'localhost';
    var port = 1090;
    ftp(host, port, user, contrasena);
}
if (module === require.main){
    main();
}
//Funciones
function getPaths (dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
            getPaths(name, files_);
            files_.push(name)
        }
    }
    return files_;
}
function getLCD(absolutePath, dirLocal){
    var paths;
    paths = getPaths(absolutePath, paths);
    //console.log(paths.length);
    //console.log(paths);
    for(var i = 0; i<paths.length; i++){
        if(dirLocal == paths[i]){
            console.log("Directorio LCD correcto");
            return dirLocal;
        }        
    }
    console.log('No se encontro el directiorio LCD ' + dirLocal + ', (LCD devuelto a directorio ./files/)')
    return absolutePath;    
}
function putArchivo(dirActual, socket, nombre){
    var nombre = nombre;
    var path = dirActual;
    
    var packages = 0;
    var totalBytes = 0;    
    var readStream = fs.createReadStream(path, {highWaterMark: 16384});
    readStream.on('data', function(chunk){
        packages++;    
        var head = Buffer.from("FILE")  ;
        var sizeHex = chunk.length.toString(16);
        while(sizeHex.length < 4){
            sizeHex = "0" + sizeHex;
        }        
        var size = Buffer.from(sizeHex) 
        console.log(size.length);
        //console.log("size", chunk.length, "hex", sizeHex);
        var delimiter = Buffer.from("@")       
        var pack = Buffer.concat([head, size, chunk, delimiter]);
        console.log(pack.toString())
        totalBytes += pack.length;
        socket.write(pack);         
    });
    readStream.on('close', function(){
        if(totalBytes !=0 ){
            socket.write("fin^"+nombre)
            console.log("El archivo "+nombre+ " se envio completamente")
        }else{
            socket.write("No se encontro el archivo");
            console.log("No se encontro el archivo")

        }
    });
    readStream.on('error', function(){
        console.log("No se encontro el archivo");
        readStream.close();
    });
}