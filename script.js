const fs = require('fs');
const path = require('path');
const globPattern = ['controller/user', 'controller/admin'];
let msgs = new Set();
let allFiles = [];

globPattern.forEach(dir => {
    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith('.js')) {
            const filePath = path.join(dir, file);
            allFiles.push(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            const regex = /(message|success|error)\s*:\s*["']([^"']+)["']/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                if(match[2].trim() !== "" && match[2] !== "success" && match[2] !== "error") {
                    msgs.add(match[2]);
                }
            }
        }
    });
});

let constMap = {};
let constCode = "// constants.js\nmodule.exports = {\n";
Array.from(msgs).forEach((msg, i) => {
    let constName = msg.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/_$/, '').replace(/^_/, '');
    if (!constName) constName = 'EMPTY_' + i;
    constName = "MSG_" + constName;
    if (constMap[constName]) {
        constName += "_" + i;
    }
    constMap[constName] = msg;
    constCode += `    ${constName}: "${msg}",\n`;
});
constCode += "};\n";

fs.writeFileSync('helpers/constants.js', constCode);
console.log('Constants written to helpers/constants.js');

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;
    
    Object.keys(constMap).forEach((constName) => {
        let msg = constMap[constName];
        let escapedMsg = msg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const pattern1 = "(message|success|error)\\\s*:\\\s*\"" + escapedMsg + "\"";
        const pattern2 = "(message|success|error)\\\s*:\\\s*'" + escapedMsg + "'";
        
        const msgRegex1 = new RegExp(pattern1, 'g');
        const msgRegex2 = new RegExp(pattern2, 'g');
        
        if (msgRegex1.test(content) || msgRegex2.test(content)) {
            hasChanges = true;
            content = content.replace(msgRegex1, "$1: constants." + constName);
            content = content.replace(msgRegex2, "$1: constants." + constName);
        }
    });
    
    if (hasChanges) {
        let requirePath = file.indexOf('user') > -1 || file.indexOf('admin') > -1 ? '../../helpers/constants' : '../helpers/constants';
        content = "const constants = require('" + requirePath + "');\n" + content;
        fs.writeFileSync(file, content);
    }
});
console.log('Controllers updated.');
