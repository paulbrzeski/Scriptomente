const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('./store.js');
const Importer = require('./importer.js');
let mainWindow;

// In main process.
const {ipcMain} = require('electron')
ipcMain.on('asynchronous-message', (event, arg) => {
  console.log(arg)  // prints "ping"
  event.sender.send('asynchronous-reply', 'pong')
})

ipcMain.on('synchronous-message', (event, arg) => {
  console.log(arg)  // prints "ping"
  event.returnValue = 'pong'
})

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Import from Evernote Export (.enex)',
        click () { handleImport(); }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: (function () {
          if (process.platform === 'darwin') {
            return 'Alt+Command+I'
          } else {
            return 'Ctrl+Shift+I'
          }
        })(),
        click: function (item, focusedWindow) {
          if (focusedWindow) {
            focusedWindow.toggleDevTools()
          }
        }
      },
      {
        role: 'close'
      }
    ]
  },
  
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

// This is the main store for the application.
const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    // 800x600 is the default size of our window
    windowBounds: { width: 800, height: 600 },
    notebooks: {
      unsorted: {}
    }
  }
});

// When our app is ready, we'll create our BrowserWindow
app.on('ready', function() {
  console.log(store);
  // First we'll get our height and width. This will be the defaults if there wasn't anything saved
  let { width, height } = store.get('windowBounds');

  // Pass those values in to the BrowserWindow options
  mainWindow = new BrowserWindow({ /*frame: false, transparent: true,*/ width, height });

  // The BrowserWindow class extends the node.js core EventEmitter class, so we use that API
  // to listen to events on the BrowserWindow. The resize event is emitted when the window size changes.
  mainWindow.on('resize', () => {
    // The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
    // the height, width, and x and y coordinates.
    let { width, height } = mainWindow.getBounds();
    // Now that we have them, save them using the `set` method.
    store.set('windowBounds', { width, height });
  });

  mainWindow.loadURL('file://' + path.join(__dirname, 'index.html'));
});

function handleImport () {
  var filename = dialog.showOpenDialog({properties: ['openFile']})[0];
  
  var cb = function(result) {
    result.forEach(function(note){
      /*
        Variables: Original location
          name: note.title,
          data: formatNoteContent(note.content),
          original_created: note.created,
          original_updated: note.updated,
          source: source_url
      */
      let destination_file = note.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
      fs.writeFileSync(path.join(store.data_dir, destination_file), JSON.stringify(note.data));

      let notebooks = store.get('notebooks');
      if (notebooks.unsorted[note.name]) {
        console.log('Import is replacing existing note - "' + note.name + '"');
      }
      notebooks.unsorted[note.name] = {
        filename: destination_file,
        original_created: note.original_created,
        original_updated: note.original_updated,
        source: note.source
      };
      
      store.set('notebooks', { unsorted: notebooks.unsorted });
    });
  }
  new Importer(filename, cb);
  
}