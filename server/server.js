const net = require('net');
var sockets = new Array();
var fs = require('fs');
const absolutePath = './files'

//usuarios con permiso de eliminar
//usuario y contraseña
let users = [['Luis','l123'],['Marco','m123'],['Daniel','d123']];

function inicio(socket){    
    //Variables para PUT
    var tempPut= false;
    var nombreArchivo = '';
    var packets = 0;
    var buffer2 = Buffer.alloc(0)
    var temp = false;
    var tamanio=0;

    var cantPuts = 0;
    var posPutActual = 0;
    var SU = false;
    var dirActual =[];
    dirActual.push(absolutePath);

    socket.on('data', data => {
        if(tempPut){
            if(data !=  'No se encontro el archivo'){                
                if(data.toString().split('^')[0] == "fin") {
                    console.log("entra")
                    nombreArchivo = data.toString().split('^')[1]
                    tokens = data.toString().split("fin")
                    //tamanio = tokens[1];
                    //console.log(tokens[0])    
                    temp = true;                    
                }     
                packets++;                                

                if(temp == false){        
                    buffer2 = Buffer.concat([buffer2, data]);
                }        
                console.log(buffer2.length); 
                var head = buffer2.slice(0, 30);
                    
                if(temp){
                    temp = false
                    //console.log("Entrooooo")
                    var writeStream = fs.createWriteStream(dirActual[dirActual.length -1] + '/'+ nombreArchivo);
                    var te = 0
                    while(buffer2.length){
                        te ++;
                        //console.log(buffer2.length)
                        var head = buffer2.slice(0, 50);
                        //console.log(te)
                        if(head.toString().slice(0,4) != "FILE"){
                            console.log("ERROR!!!!" + head.toString().slice(0,20));
                            process.exit(1);
                        }
                        
                        var sizeHex = buffer2.slice(4, 8);
                        var size = parseInt(sizeHex, 16);
                        var content = buffer2.slice(8, size + 8);
                        var delimiter = buffer2.slice(size + 8, size + 9);
                        //console.log("delimiter", delimiter.toString());
                        if(delimiter != "@"){
                            delimiter = buffer2.slice(size + 61, size + 62);
                            //console.log("delimiter2 ", delimiter.toString());
                            if(delimiter == "@"){
                                size = size + 62 - 9
                                //console.log("Acomode el delimitador");                    
                            }
                            else{
                                content = Buffer.concat([content,buffer2.slice(size,buffer2.length)])
                                size = buffer2.length
                            }                
                        }                        
                        writeStream.write(content);
                        buffer2 = buffer2.slice(size + 9);
                    }
                    
                    
                    setTimeout(function(){
                        console.log("El archivo '" +  nombreArchivo + "' se copio exitosamente")
                        writeStream.close();
                        packets = 0;
                        buffer2 = Buffer.alloc(0)
                        temp = false;
                        tamanio=0;
                        //ya no se reciben mas paquetes para get
                        nombreArchivo = "";
                        posPutActual = posPutActual +1;
                        if(posPutActual <cantPuts){
                            tempPut = true; 
                        }else{
                            tempPut = false;
                            posPutActual =0;
                        }
                    }, 2000);
                }                               
            }else{
                console.log(data.toString());
                posPutActual = posPutActual +1;
                if(posPutActual <cantPuts){
                    tempPut = true; 
                }else{
                    tempPut = false;
                    posPutActual =0;
                }
            }                
        }else{
            peticion = data.toString('utf-8');
            tokens = peticion.split('^');            
            msg = tokens;
            console.log(msg);
            if(tokens[0] == 'OPEN'){
                nombreUser = tokens[1].split('@');
                nombreUser = nombreUser[0];
                
                console.log('Conexion de usuario '+nombreUser);
                for(var s=0; s<users.length; s++){
                    if(users[s][0] == nombreUser && users[s][1] == tokens[3]){
                        SU = true;
                    }                
                }
            }
            else if(tokens[0] == 'CLOSE'){
                socket.end();
                msg = 'm^server@localhost^-^' + tokens[1].split('@')[0] + ' se marchó desde ' + tokens[1].split('@')[1]+ "\n";
            }
            else if(tokens[0] == 'GET'){                     
                getArchivo(dirActual[dirActual.length -1] + '/'+ tokens[2], socket, tokens[2]);           
            }
            else if(tokens[0] == 'MGET'){  
                for(var g=2;g<tokens.length;g++){
                    var arch = tokens[g]
                    
                    getArchivo(dirActual[dirActual.length -1] + '/'+ arch, socket, arch);
                }                   
            }            
            else if(tokens[0] == 'PUT'){
                //putArchivo(dirActual[dirActual.length -1] +'/' + tokens[1],tokens[2], socket, tokens[1]);
                //nombreArchivo = tokens[1];
                cantPuts = tokens[1];
                tempPut = true;                
            }
            else if(tokens[0] =='LS'){                
                var paths;            
                paths = getPaths(dirActual[dirActual.length -1], paths);   
                socket.write('LS^'+paths)                                      
            }
            else if(tokens[0] =='CD'){
                if(tokens[2] == '..'){ 
                    if(dirActual[dirActual.length -1] != absolutePath){
                        dirActual.pop();
                        socket.write('CD^'+dirActual[dirActual.length -1]);
                    }else{
                        socket.write('CD^'+"No se puede regresar mas, se encuentra en la carpeta inicial")
                    }                    
                }else{ 
                    nDirActual = getNextPath(dirActual[dirActual.length -1], tokens[2]);
                    if(nDirActual != tokens[2]){//si existe el path entonces entrar
                        dirActual.push(nDirActual)
                        socket.write('CD^'+nDirActual);
                    }else{
                        socket.write('CD^'+"No se encontro el directorio")
                    } 
                }                                                    
            }   
            else if(tokens[0] =='DELETE'){   
                if(SU==true){
                    for(var g=2;g<tokens.length;g++){
                        var arch = tokens[g]
                        eliminaArchivo(dirActual[dirActual.length -1] + '/' + arch, arch, socket);                    
                    }
                }else{
                    socket.write('DELETE^No tienes permiso para eliminar archivos, verifica que tu usuario tenga los permisos necesarios');
                }            
            }
            else if(tokens[0] =='DELETE-R'){
                if(SU==true){
                    fs.rm(tokens[2], { recursive: true }, (err) => {
                        if (err) {
                        console.error(err)
                        socket.write('DELETE^No se pudo eliminar el archivo el directorio');
                        }else{
                            socket.write('DELETE^ Directorio eliminado');
                        }
                    });
                }else{
                    socket.write('DELETE^No tienes permiso para eliminar archivos, verifica que tu usuario tenga los permisos necesarios');
                }            
            }
            else if(tokens[0] =='RMDIR'){
                fs.rmdir(tokens[2], (err) => {
                    if (err) {
                        console.error(err)
                        socket.write('DELETE^No se pudo eliminar el directorio ' +tokens[2]);
                    }else{
                        socket.write('DELETE^Directorio '+tokens[2] + ' eliminado');
                    }
                });
            }
            else if(tokens[0] =='PWD'){
                socket.write('PWD^' + dirActual[dirActual.length -1]);                
            }         
        }
        
    })
    socket.on('close', () =>{
        console.log("Se cerro la conexión de un cliente");
    })
    socket.on('error', (err) =>{
        console.log(err);
        process.exit(0);
    })
}
const server = net.createServer(socket => {
    sockets.push(socket);
    inicio(socket);
}).on('close', () =>{
    console.log("Conexión cerrada!");
    server.end();
}).on('error', err => {
    console.log("HAY UN ERROR");
    throw err;
})
server.listen(1090, 'localhost', () => {
    console.log('Servidor activo en puerto ' + server.address().port + ', direccion '+  server.address().address);
});
//Funciones
function getPaths (dir, files_){
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
            files_.push(name);
            getPaths(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}
function getNextPath (dir, dirNext){
    var files = fs.readdirSync(dir);
    //console.log(files)
    for (var i in files){
        if(files[i] == dirNext){
            dirNext = dir+ '/' + dirNext;            
        }
    }
    return dirNext;
}
function putArchivo(direccion, data, socket, nombre){
    fs.writeFile(direccion, data,{encoding: 'binary'}, (err) => {
        if (err){
            console.log(err);
            socket.write("PUT^Ocurrio algun error al subir el archivo" + nombre);
        }                    
        else {
            socket.write("PUT^El archivo " + nombre  + " se copio exitosamente");
            
        }
    });
}
function eliminaArchivo(direccion, arch, socket){
    fs.unlink(direccion, (err) => {
        if (err) {
            console.error(err)
            socket.write('DELETE^No se pudo eliminar el archivo ' + arch);
        }else{
            socket.write('DELETE^Archivo ' + arch + ' eliminado');
        }
    });
}
function getArchivo(dirActual, socket, nombre){
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
        // socket.write("fin")
        if(totalBytes !=0 ){
            socket.write("fin^"+nombre)
        }else{
            socket.write("No se encontro el archivo");
        }
        console.log("total packages", packages);
        console.log("total bytes sent", totalBytes);
    });
    readStream.on('error', function(){
        socket.write("No se encontro el archivo");
        readStream.close();
    });
}