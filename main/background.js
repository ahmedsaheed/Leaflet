import { app, ipcMain, shell , dialog } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import path from 'path';
import open from 'open';
const fs = require( 'fs-extra' );
const os = require( 'os' );
const { Notification } = require( 'electron' );
const chokidar = require( 'chokidar' );

const markdown = `
# Lefts

<img src="https://raw.githubusercontent.com/hundredrabbits/100r.co/master/media/content/characters/left.hello.png" width="300"/>

<a href="http://wiki.xxiivv.com/Left" target="_blank"></a>Left is <b>distractionless plaintext editor</b> designed to quickly navigate between segments of an essay, or multiple documents. It features an auto-complete, synonyms suggestions, writing statistics, markup-based navigation and a speed-reader.
 $(ax^2 + bx + c = 0)$  

$$\sqrt{3x-1}+(1+x)^2$$

The <a href="http://github.com/hundredrabbits/Left" target="_blank" rel="noreferrer" class="external ">application</a> was initially created to help Rek with the writing of the upcoming novel Wiktopher, and later made available as a free and <a href="https://github.com/hundredrabbits/Left" target="_blank" rel="noreferrer" class="external ">open source</a> software.

$$\left( \sum_{k=1}^n a_k b_k \right)^2 \leq \left( \sum_{k=1}^n a_k^2 \right) \left( \sum_{k=1}^n b_k^2 \right)$$


Learn more by reading the <a href="https://100r.co/site/left.html" target="_blank" rel="noreferrer" class="external ">manual</a>, or have a look at a <a href="https://www.youtube.com/watch?v=QloUoqqhXGE" target="_blank" rel="noreferrer" class="external ">tutorial video</a>. If you need <b>help</b>, visit the <a href="https://hundredrabbits.itch.io/left/community" target="_blank" rel="noreferrer" class="external ">Community</a>.

- [ ] Mercury
- [x] Venus
- [x] Earth (Orbit/Moon)
- [x] Mars


## Install & Run

You can download [builds](https://hundredrabbits.itch.io/left) for **OSX, Windows and Linux**, or if you wish to build it yourself, follow these steps:

Here's a simple footnote,[^1] and here's a longer one.[^bignote]

[^1]: This is the first footnote.

[^bignote]: Here's one with multiple paragraphs and code.

    Indent paragraphs to include them in the footnote.
    Add as many paragraphs as you like.

<img src='https://raw.githubusercontent.com/hundredrabbits/Left/master/PREVIEW.jpg' width="600"/>

## Extras

- This application supports the [Ecosystem Theme](https://github.com/hundredrabbits/Themes).
- Support this project through [Patreon](https://patreon.com/100).
- Left's source code is licensed under [MIT](https://github.com/hundredrabbits/Left/blob/master/LICENSE) and the **images, text and assets** are licensed under [BY-NC-SA 4.0](https://github.com/hundredrabbits/Left/blob/master/LICENSE.by-nc-sa-4.0.md). View individual licenses for details.
- Pull Requests are welcome!
`;

const appDir = path.resolve( os.homedir(), 'dairy' );

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
     width: 800,
     height: 462,
     minWidth: 400,
     minHeight: 360,
      resizable: false,
      fullscreen: false,
  });
    mainWindow.webContents.on('new-window', function(e, url) {
  e.preventDefault();
  setTimeout(() => { require('electron').shell.openExternal(url) }, 500)
 });


  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

export const saveNotif = (name) =>{
  const notif = new Notification( {
      title: 'File saved',
      body: `${ name } has been successfully saved.`
  } );

  notif.show();
}

export const created = (name) =>{
  const notif = new Notification( {
      title: 'File Created',
      body: `${ name }.md has been successfully created.`
  } );

  notif.show();
}



const filesAdded = ( size ) => {
  const notif = new Notification( {
      title: 'Files added',
      body: `${ size } ${size > 1 ? "files" : "file" } has been successfully added.`
  } );

  notif.show();
};
const checkForDir = () => {
  if(!fs.existsSync(appDir)){
    //create the directory
    fs.mkdirSync(appDir);
    //create the file hello.md
    fs.writeFileSync(path.resolve(appDir, 'hello.md'), markdown);
  }
  }


const getFiles = () => {
  checkForDir();
  const files = fs.readdirSync( appDir ); 
  let place = 0

  //return only files that end with .md
  return files.filter( file => file.endsWith( '.md' ) ).map( filename => {
      const filePath = path.resolve( appDir, filename );
      const fileStats = fs.statSync( filePath );
      //get the body of the file
      const content = fs.readFileSync( filePath, 'utf8' );
      place++;

      return {
          index: place,
          name: filename,
          body: content,
          path: filePath,
          size: Number( fileStats.size / 1000 ).toFixed( 1 ), // kb
      };
  } );
};

const addFiles = ( files = [] ) => {
    
  // ensure `appDir` exists
  fs.ensureDirSync( appDir );
  
  // copy `files` recursively (ignore duplicate file names)
  files.forEach( file => {
      const filePath = path.resolve( appDir, file.name );

      if( ! fs.existsSync( filePath ) ) {
          fs.copyFileSync( file.path, filePath );
      }
  } );

  // display notification
  filesAdded( files.length );
};

const deleteFile = ( filename ) => {
  const filePath = path.resolve( appDir, filename );

  // remove file from the file system
  if( fs.existsSync( filePath ) ) {
      fs.removeSync( filePath );
  }
};

const openFile = ( filename ) => {
  const filePath = path.resolve( appDir, filename );

  // open a file using default application
  if( fs.existsSync( filePath ) ) {
      open( filePath );
  }
};

const watchFiles = ( win ) => {
  chokidar.watch( appDir ).on( 'unlink', ( filepath ) => {
      win.webContents.send( 'app:delete-file', path.parse( filepath ).base );
  } );
}

const newFile = ( file ) => {

  if(fs.existsSync(appDir)){
    fs.writeFileSync( path.resolve( appDir, `${file}.md`), "Hello **World**" );

  }
}

//make the below handler async



ipcMain.handle( 'createNewFile', async (event, filename ) => {
  newFile( filename );
  created( filename );
})


// return list of files
ipcMain.handle( 'getTheFile', () => {
  console.log("got here")
    return getFiles();
} );

// listen to file(s) add event
ipcMain.handle( 'app:on-file-add', ( event, files = [] ) => {
    addFiles( files );
} );

ipcMain.handle( 'app:on-fs-dialog-open', ( event ) => {
  const files = dialog.showOpenDialogSync( {
      properties: [ 'openFile', 'multiSelections' ],
  } );

  if( !files) {
      return;
  }

  addFiles( files.map( filepath => {
      return {
          name: path.parse( filepath ).base,
          path: filepath,
      };
  } ) );
} );

// listen to file delete event
ipcMain.on( 'app:on-file-delete', ( event, file ) => {
  deleteFile( file.filepath );
} );

// listen to file open event
ipcMain.on( 'app:on-file-open', ( event, file ) => {
  openFile( file.filepath );
} );

// listen to file copy event
ipcMain.on( 'app:on-file-copy', ( event, file ) => {
  event.sender.startDrag( {
      file: file.filepath,
      icon: file.icon,
  } );
} );

app.on('window-all-closed', () => {
  app.quit();
});