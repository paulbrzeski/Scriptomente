/*
  Evernote Import script for scriptomente
  Usage: node import.js <filename.enex>
*/
const fs = require('fs'),
      path      = require('path'),
      toMarkdown = require('to-markdown'),
      XmlStream = require('xml-stream');

function formatNoteContent (content) {
  return replaceMediaTags(content.substring(
    content.indexOf("<en-note>") + "<en-note>".length,
    content.indexOf("</en-note>")
  ));
}

function replaceMediaTags (content) {
  let pattern = /<en-media ([\s\S]*?)><\/en-media>/g;
  let match = pattern.exec(content);
  while(match != null) {
    let [original_element, raw_metadata] = match;
    raw_metadata = raw_metadata.split(' ');
    let metadata = {};

    for (var keyname in raw_metadata) {
      // note both ascii double quotes are here... hail satan.
      let parsed_metadata = raw_metadata[keyname].replace('"','').replace('"','').split('=');
      metadata[parsed_metadata[0]] = parsed_metadata[1];
    }
    console.log(metadata);
    match = pattern.exec(content);
  }
  return content;
}

let filename = process.argv[2];
var stream = fs.createReadStream(filename);
var xml = new XmlStream(stream);
xml.on('endElement: note', function(note) {
  var mapping = {
    name: note.title,
    data: formatNoteContent(note.content),
    original_created: note.created,
    original_updated: note.updated
  }
  //console.log(mapping);
  for (var keyname in note) {
    console.log(keyname);
  }
  //console.log(note);
  die();
});

// // Debug
// xml.on('error', function(message) {
//   console.log('Parsing as ' + ('auto') + ' failed: ' + message);
// });
// xml.on('data', function(data) {
//   //process.stdout.write(data);
// });