const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create the "db" folder if it doesn't exist
const dbFolder = path.join(__dirname, 'db');
if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
}

// Paths to the .asms and .asmc files
const asmsFile = path.join(dbFolder, 'app.asms');
const asmcFile = path.join(dbFolder, 'app.asmc');

// Create the "app.asms" file if it doesn't exist
if (!fs.existsSync(asmsFile)) {
    const defaultAsmsContent = `(script
    (hello :func (console.log("Hello from ASMS!")))
    (world :data (% hello world! %))
    (world :read) ;; output: hello world!
    (numbers :data (1234.5678))
    (numbers :read) ;; output: 1234.5678
    (math :data (69+69))
    (math :read) ;; output: 138
)`;
    fs.writeFileSync(asmsFile, defaultAsmsContent);
}

// Compile .asms to .asmc using the Python compiler
if (!fs.existsSync(asmcFile)) {
    try {
        console.log('Compiling .asms to .asmc...');
        execSync(`python asmc.py ${asmsFile} ${asmcFile}`);
        console.log('Compilation successful!');
    } catch (e) {
        console.error('Error compiling .asms to .asmc:', e.message);
        process.exit(1);
    }
}

// Read and interpret the .asmc file
function read_asmc(file) {
    const buffer = fs.readFileSync(file);
    let offset = 0;
    const commands = [];
    while (offset < buffer.length) {
        const type = buffer.readUInt8(offset);
        offset += 1;
        if (type === 0x01) {  // Function type
            const nameLength = buffer.readUInt8(offset);
            offset += 1;
            const name = buffer.toString('utf-8', offset, offset + nameLength);
            offset += nameLength;
            const codeLength = buffer.readUInt8(offset);
            offset += 1;
            const code = buffer.toString('utf-8', offset, offset + codeLength);
            offset += codeLength;
            commands.push({ type: 'func', name, code });
        } else if (type === 0x02) {  // Data type
            const nameLength = buffer.readUInt8(offset);
            offset += 1;
            const name = buffer.toString('utf-8', offset, offset + nameLength);
            offset += nameLength;
            const valueLength = buffer.readUInt8(offset);
            offset += 1;
            const value = buffer.toString('utf-8', offset, offset + valueLength);
            offset += valueLength;
            commands.push({ type: 'data', name, value });
        } else if (type === 0x03) {  // Read type
            const nameLength = buffer.readUInt8(offset);
            offset += 1;
            const name = buffer.toString('utf-8', offset, offset + nameLength);
            offset += nameLength;
            commands.push({ type: 'read', name });
        } else if (type === 0x04) {  // Math type
            const nameLength = buffer.readUInt8(offset);
            offset += 1;
            const name = buffer.toString('utf-8', offset, offset + nameLength);
            offset += nameLength;
            const exprLength = buffer.readUInt8(offset);
            offset += 1;
            const expression = buffer.toString('utf-8', offset, offset + exprLength);
            offset += exprLength;
            commands.push({ type: 'math', name, expression });
        }
    }
    return commands;
}

function execute_commands(commands) {
    const variables = {};
    const functions = {};
    commands.forEach(command => {
        if (command.type === 'func') {
            // Define a function
            functions[command.name] = new Function(command.code);
        } else if (command.type === 'data') {
            // Define a variable
            variables[command.name] = command.value;
        } else if (command.type === 'read') {
            // Read a variable
            if (variables[command.name]) {
                console.log(variables[command.name]); // Output without prefix
            } else {
                console.log(`Variable ${command.name} not found.`);
            }
        } else if (command.type === 'math') {
            // Evaluate a math expression
            try {
                const result = eval(command.expression);
                console.log(result); // Output without prefix
            } catch (e) {
                console.log(`Error evaluating math expression: ${e.message}`);
            }
        }
    });
}

function main() {
    const commands = read_asmc(asmcFile);
    execute_commands(commands);
}

main();