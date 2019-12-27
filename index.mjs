import path from "path";
import fs from "fs";
import Foldmaker, { tokenize } from "./foldmaker";

const directoryPath = path.join(
  "/Users/sojern/Projects/adphorus/adphorus-temenni-app/src"
);

function getFiles(dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files) {
    var name = dir + "/" + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
}

function getFileNameInfo(files) {
  return files.map(directory => {
    let lastSlashIndex = directory.lastIndexOf("/");
    let name = directory.substring(lastSlashIndex + 1);
    let lastDotIndex = name.lastIndexOf(".");
    let extension = lastDotIndex !== -1 ? name.substring(lastDotIndex + 1) : "";
    return { directory, name, extension };
  });
}

function transform(value, transformations) {
  let tokens = tokenize(value, [
    ["b", /\.bind\(this\);/], // .bind(this)
    [".", /\./], // dot
    ["\n", /\n/], // newline
    ["u", /[\s\n\r\S]/] // others
  ]);

  let fm = Foldmaker.from(tokens).parse(
    [
      ["bind_expression", /(\n[^\n]+)(\.)(u+?)(b)/], // Comment
      ["default", /[\s\n\r\S]/] // Unknown
    ],
    {
      bind_expression(result) {
        let functionName = result[3].join("");
        transformations.push(functionName);
        return ''
      }
    }
  );
  let newFileContent = fm.join("");
  return newFileContent;
}

function getShortFilePath() {
  return 
} 

function main() {
  // Get .js files
  let files = getFiles(directoryPath);
  files = getFileNameInfo(files);
  let jsFiles = files.filter(file => file.extension === "js");

  jsFiles.forEach(file => {
    // Read file and tokenize it
    let fileContent = fs.readFileSync(file.directory, "utf8");
    let tokens = tokenize(fileContent, [
      ["c", /constructor\(.*\) \{[\s\S]+?.bind[\s\S]+?\}/], // constructor
      ["u", /[\s\n\r\S]/] // others
    ]);

    let newFileContent = "",
      transformations = [];

    tokens.forEach(({ type, value }) => {
      if (type === "c") newFileContent += transform(value, transformations);
      else newFileContent += value;
    });

    if (transformations.length !== 0) {
      // If transformations are not empty, generate a regex from them and apply them
      let directory = file.directory.slice(-50)
      console.log("..."+directory + ' (' + transformations.length + ' functions)')
      let regex = `([^\.])(${transformations.join("|")})\((.*)\) \{` 
      newFileContent = newFileContent.replace(new RegExp(regex, 'g'), '$1$2 = $3 => {')
      fs.writeFileSync(file.directory, newFileContent);
    }
  });
}

main();