const electron = require('electron');
const fs = require('fs'),
      path      = require('path'),
      crypto    = require('crypto'),
      XmlStream = require('xml-stream');

class Importer {
  constructor(filename, callback) {
    let stream = fs.createReadStream(filename);
    let xml = new XmlStream(stream);
    let result = [];    
    xml.collect('resource'); // Maps multiple 'resource' tags into array
    xml.on('endElement: note', function(note) {
      processResources(note.resource);
      let source_url = note['note-attributes']['source-url'] ? note['note-attributes']['source-url'] : '';
      result.push({
        name: note.title,
        data: formatNoteContent(note.content),
        original_created: note.created,
        original_updated: note.updated,
        source: source_url
      });
    });
    xml.on('end', function() {
      callback(result);
    });
  }
  
}


function formatNoteContent (content) {
  return replaceMediaTags(content.substring(
    content.indexOf("<en-note>") + "<en-note>".length,
    content.indexOf("</en-note>")
  ));
}

function replaceMediaTags (content) {
  let pattern = /<en-media ([\s\S]*?)><\/en-media>/g;
  let match = pattern.exec(content);
  while (match != null) {
    let [original_element, raw_metadata] = match;
    raw_metadata = raw_metadata.split(' ');
    let metadata = {};

    for (var keyname in raw_metadata) {
      // note both ascii double quotes are here... hail satan.
      let parsed_metadata = raw_metadata[keyname].replace('"','').replace('"','').split('=');
      metadata[parsed_metadata[0]] = parsed_metadata[1];
    }
    if (resources[metadata.hash]) {
      let imageTag = '<img ';
      imageTag += 'width="' + metadata.width + '" ';
      imageTag += 'height="' + metadata.height + '" ';
      imageTag += 'alt="' + metadata.alt + '" ';
      imageTag += 'src="data:image/png;base64,' + resources[metadata.hash] + '" ';
      imageTag += " />";
      content = content.replace(original_element, imageTag);
    }

    // Continue the loop.
    match = pattern.exec(content);
  }
  return content;
}

let resources = {};
function processResources (raw_resources) {
  resources = {};
  if (!raw_resources) {
    return resources;  
  }
  raw_resources.forEach(function(res){
    let hash;
    // Only generate the hash if its missing.
    if (!res.recognition) {
      var buf = new Buffer(res.data.$text, 'base64');
      hash = crypto.createHash('md5')
        .update(buf, 'utf8')
        .digest('hex');
    }
    else {
      let rex = /objID="(.*?)"/g;  
      hash = res.recognition.match(rex)[0].replace('objID=','').replace('"','').replace('"','');
    }
    resources[hash] = res.data.$text;
  });
  return resources;
}

// expose the class
module.exports = Importer;
