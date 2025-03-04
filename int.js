const fs = require('fs');
const os = require('os');
const path = require('path');

class WSTInterpreter {
    constructor() {
        this.variables = {};
        this.custom_keywords = {};
        this.functions = {};
        this.current_bit_limit = null;
        this.should_generate_js = false;
        this.js_code = '';
    }

    load_mod(mod_path) {
        const mod_content = fs.readFileSync(mod_path, 'utf8');

        const mod_pattern = /keyword\.(\$\w+\$)\.(\$\w+\$) => \(local \1 \2\)/g;
        const mod_matches = [...mod_content.matchAll(mod_pattern)];

        for (const [_, word, type_] of mod_matches) {
            this.custom_keywords[word] = type_;
        }

        if (mod_content.includes('mod.s')) {
            // Silently enable the mod
        }
    }

    interpret_wst(wst_content) {
        const lines = wst_content.split('\n');
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line.startsWith('($add')) {
                const mod_folder = line.split(' ')[1];
                this.load_mods_from_folder(mod_folder);
            } else if (line.startsWith('(local')) {
                this.handle_local(line);
            } else if (line.endsWith('.set*char')) {
                this.handle_set_char(line);
            } else if (line.includes('.r')) {
                this.handle_read(line);
            } else if (line.startsWith('if')) {
                i = this.handle_if(lines, i);
            } else if (line.startsWith('else')) {
                i = this.handle_else(lines, i);
            } else if (line.startsWith('end')) {
                
            } else if (line.startsWith('(func')) {
                i = this.handle_function(lines, i);
            } else if (line.startsWith('return')) {
                this.handle_return(line);
            } else if (line.includes('.r') && line.includes('[') && line.includes(']')) {
                this.handle_function_call(line);
            } else if (line.includes('.add[')) {
                this.handle_add(line);
            } else if (line.includes('.set[')) {
                this.handle_set(line);
            } else if (line.includes('.plus')) {
                this.handle_plus(line);
            } else if (line.includes('.mul')) {
                this.handle_mul(line);
            } else if (line.includes('.div')) {
                this.handle_div(line);
            } else if (line.includes('.min')) {
                this.handle_min(line);
            } else if (line.includes('.[')) {
                this.handle_function_call_with_args(line);
            } else if (line.includes('(wssc)')) {
                this.should_generate_js = true;
            }
            i++;
        }

        if (this.should_generate_js) {
            this.generate_js_file();
        }
    }

    generate_js_file() {
        const js_code = `
    // input info
    // if you're making a website with github, you need to fill out these infos
    let user = ''; // username
    let repo = ''; // repository name
    let rname = ''; // filename from repo
    let filename = ''; // the .wst file name (.wst should not be included)

    // Get the filename from the URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const fname = urlParams.get('file') || filename + '.wst'
    
    // web-interpreter.js - Browser-compatible WST interpreter
    class WSTInterpreter {
        constructor() {
            this.variables = {};
            this.custom_keywords = {};
            this.functions = {};
            this.current_bit_limit = null;
        }
    
        async load_wst_file(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(\`Failed to fetch \${url}: \${response.status} \${response.statusText}\`);
                }
                const wst_content = await response.text();
                this.interpret_wst(wst_content);
            } catch (error) {
                console.error('Error loading .wst file:', error);
            }
        }
    
        interpret_wst(wst_content) {
            const lines = wst_content.split('\\n');
            let i = 0;
            while (i < lines.length) {
                const line = lines[i].trim();
                if (line.startsWith('(local')) {
                    this.handle_local(line);
                } else if (line.endsWith('.set*char')) {
                    this.handle_set_char(line);
                } else if (line.includes('.r')) {
                    this.handle_read(line);
                } else if (line.startsWith('if')) {
                    i = this.handle_if(lines, i);
                } else if (line.startsWith('else')) {
                    i = this.handle_else(lines, i);
                } else if (line.startsWith('(func')) {
                    i = this.handle_function(lines, i);
                } else if (line.includes('.add[')) {
                    this.handle_add(line);
                } else if (line.includes('.set[')) {
                    this.handle_set(line);
                }
                i++;
            }
        }
    
        handle_local(line) {
            const var_pattern = /\\(local (\\d+) i\\*(\\d+)\\)/;
            const var_match = line.match(var_pattern);
            if (var_match) {
                const var_name = var_match[1];
                const var_bits = parseInt(var_match[2]);
    
                if (this.current_bit_limit !== null && var_bits > this.current_bit_limit) {
                    console.log(\`Error: Variable \${var_name} exceeds the bit limit of \${this.current_bit_limit}.\`);
                    return;
                }
    
                this.variables[var_name] = 0;
            }
        }
    
        handle_set_char(line) {
            const set_char_pattern = /(\\d+)\\.set\\*char/;
            const set_char_match = line.match(set_char_pattern);
            if (set_char_match) {
                const var_name = set_char_match[1];
                if (this.variables[var_name] !== undefined && typeof this.variables[var_name] === 'number') {
                    this.variables[var_name] = String.fromCharCode(this.variables[var_name]);
                }
            }
        }
    
        handle_read(line) {
            const read_pattern = /(\\d+)\\.r/;
            const read_match = line.split(';;')[0].trim().match(read_pattern);
            if (read_match) {
                const var_name = read_match[1];
                if (this.variables[var_name] !== undefined) {
                    console.log(this.variables[var_name]);
                }
            }
        }
    
        handle_if(lines, i) {
            const if_pattern = /if\\s+(\\d+)\\[(\\d+)\\]/;
            const if_match = lines[i].trim().match(if_pattern);
            if (if_match) {
                const var_name = if_match[1];
                const expected_value = parseInt(if_match[2]);
    
                const if_block = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('else') && !lines[i].trim().startsWith('end')) {
                    if_block.push(lines[i].trim());
                    i++;
                }
    
                const else_block = [];
                if (i < lines.length && lines[i].trim().startsWith('else')) {
                    i++;
                    while (i < lines.length && !lines[i].trim().startsWith('end')) {
                        else_block.push(lines[i].trim());
                        i++;
                    }
                }
    
                this.if_stmt(var_name, expected_value, if_block, else_block);
            }
            return i;
        }
    
        if_stmt(var_name, value, code_if, code_else = null) {
            if (this.variables[var_name] !== undefined) {
                if (parseInt(this.variables[var_name]) === value) {
                    try {
                        for (const line of code_if) {
                            this.interpret_wst(line);
                        }
                    } catch (e) {
                        console.log(\`Error in if condition block: \${e}\`);
                    }
                } else if (code_else) {
                    try {
                        for (const line of code_else) {
                            this.interpret_wst(line);
                        }
                    } catch (e) {
                        console.log(\`Error in else condition block: \${e}\`);
                    }
                }
            } else {
                console.log(\`Error: Variable '\${var_name}' not found.\`);
            }
        }
    
        handle_add(line) {
            const add_pattern = /(\\d+)\\.add\\[(.+?)\\]/;
            const add_match = line.match(add_pattern);
            if (add_match) {
                const var_name = add_match[1];
                const numbers_str = add_match[2];
        
                if (this.variables[var_name] === undefined) {
                    console.log(\`Error: Variable \${var_name} not found.\`);
                    return;
                }
        
                if (numbers_str.includes('--')) {
                    // Convert each number to a character, separated by TAB
                    const characters = numbers_str.split('--').map(num => {
                        num = num.trim();
                        return String.fromCharCode(parseInt(num));
                    });
                    this.variables[var_name] = characters.join('\\t'); // Tab-separated output
                } else if (numbers_str.includes('==')) {
                    // Convert each number to a character, separated by NEWLINE
                    const characters = numbers_str.split('==').map(num => {
                        num = num.trim();
                        return String.fromCharCode(parseInt(num));
                    });
                    this.variables[var_name] = characters.join('\\n'); // Newline-separated output
                } else if (numbers_str.includes('=')) {
                    // Convert each number to a character, separated by SPACE
                    const characters = numbers_str.split('=').map(num => {
                        num = num.trim();
                        return String.fromCharCode(parseInt(num));
                    });
                    this.variables[var_name] = characters.join(' '); // Space-separated output
                } else {
                    // Convert each number to a character and concatenate (ABC)
                    const characters = numbers_str.split(',').map(num => {
                        num = num.trim();
                        return String.fromCharCode(parseInt(num));
                    });
                    this.variables[var_name] = characters.join(''); // Concatenated output
                }
            }
        }
    
        handle_set(line) {
            const set_pattern = /(\\d+)\\.set\\[([^\\]]+)\\]/;
            const set_match = line.match(set_pattern);
            if (set_match) {
                const var_name = set_match[1];
                const numbers_str = set_match[2];
    
                const value = this.numbers_to_value(numbers_str);
    
                if (this.variables[var_name] !== undefined) {
                    this.variables[var_name] = value;
                }
            }
        }
    
        handle_plus(line) {
            const plus_pattern = /(\\d+)\\.plus/;
            const plus_match = line.match(plus_pattern);
            if (plus_match) {
                const var_name = plus_match[1];
                if (this.variables[var_name] !== undefined) {
                    this.variables[var_name] += this.variables[var_name];
                }
            }
        }
    
        handle_mul(line) {
            const mul_pattern = /(\\d+)\\.mul/;
            const mul_match = line.match(mul_pattern);
            if (mul_match) {
                const var_name = mul_match[1];
                if (this.variables[var_name] !== undefined) {
                    this.variables[var_name] *= this.variables[var_name];
                }
            }
        }
    
        handle_div(line) {
            const div_pattern = /(\\d+)\\.div/;
            const div_match = line.match(div_pattern);
            if (div_match) {
                const var_name = div_match[1];
                if (this.variables[var_name] !== undefined) {
                    this.variables[var_name] /= this.variables[var_name];
                }
            }
        }
    
        handle_min(line) {
            const min_pattern = /(\\d+)\\.min/;
            const min_match = line.match(min_pattern);
            if (min_match) {
                const var_name = min_match[1];
                if (this.variables[var_name] !== undefined) {
                    this.variables[var_name] -= this.variables[var_name];
                }
            }
        }
    
        handle_function_call_with_args(line) {
            const func_call_pattern = /(\\$\\w+)\\.\\[([^\\]]+)\\]/;
            const func_call_match = line.match(func_call_pattern);
            if (func_call_match) {
                const func_name = func_call_match[1];
                const args_str = func_call_match[2];
    
                if (this.functions[func_name]) {
                    const [bit_limit, func_body] = this.functions[func_name];
                    const original_variables = { ...this.variables };
                    const original_bit_limit = this.current_bit_limit;
    
                    // Set input arguments
                    const args = args_str.split(',').map(arg => parseInt(arg.trim()));
                    this.variables['input'] = args;
    
                    this.current_bit_limit = bit_limit;
                    for (const func_line of func_body) {
                        this.interpret_wst(func_line);
                    }
    
                    // Restore original state
                    this.variables = original_variables;
                    this.current_bit_limit = original_bit_limit;
                }
            }
        }
    
        numbers_to_value(numbers_str) {
            const numbers = numbers_str.split(',');
            let value = 0;
            for (const num of numbers) {
                const trimmed_num = num.trim();
                if (/^\\d+$/.test(trimmed_num)) {
                    value += parseInt(trimmed_num);
                } else {
                    console.log(\`Error: Invalid number in operation: \${trimmed_num}\`);
                }
            }
            return value;
        }
    
        handle_function(lines, i) {
            const func_pattern = /\\(func (\\$\\w+)\\s+\\(result i%(\\d+)\\)\\s*\\(/;
            const func_match = lines[i].trim().match(func_pattern);
            if (func_match) {
                const func_name = func_match[1];
                const bit_limit = parseInt(func_match[2]);
                const func_body = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith(')')) {
                    func_body.push(lines[i].trim());
                    i++;
                }
                this.functions[func_name] = [bit_limit, func_body];
            }
            return i;
        }
    
        handle_return(line) {
            const return_pattern = /return\\s+(.+)\\.r/;
            const return_match = line.match(return_pattern);
            if (return_match) {
                const var_name = return_match[1];
                if (this.variables[var_name] !== undefined) {
                    console.log(this.variables[var_name]);
                }
            }
        }
    }
    
    // Initialize the interpreter and load the .wst file
    const interpreter = new WSTInterpreter();
    const wstFileUrl = \`https://raw.githubusercontent.com/\${user}/\${repo}/main/\${rname}.wst\`;
    interpreter.load_wst_file(wstFileUrl);
        `;
    
        const output_path = path.join(__dirname, 'web-interpreter.js');
        fs.writeFileSync(output_path, js_code);
        console.log(`Generated web-interpreter.js at: ${output_path}`);
    }

    load_mods_from_folder(folder_path) {
        if (!fs.existsSync(folder_path)) return;

        const files = fs.readdirSync(folder_path);
        for (const file of files) {
            if (file.endsWith('.wsmod')) {
                this.load_mod(path.join(folder_path, file));
            }
        }
    }

    handle_local(line) {
        const var_pattern = /\(local (\d+) i\*(\d+)\)/;
        const var_match = line.match(var_pattern);
        if (var_match) {
            const var_name = var_match[1];
            const var_bits = parseInt(var_match[2]);

            if (this.current_bit_limit !== null && var_bits > this.current_bit_limit) {
                console.log(`Error: Variable ${var_name} exceeds the bit limit of ${this.current_bit_limit}.`);
                return;
            }

            this.variables[var_name] = 0;
        }
    }

    handle_set_char(line) {
        const set_char_pattern = /(\d+)\.set\*char/;
        const set_char_match = line.match(set_char_pattern);
        if (set_char_match) {
            const var_name = set_char_match[1];
            if (this.variables[var_name] !== undefined && typeof this.variables[var_name] === 'number') {
                this.variables[var_name] = String.fromCharCode(this.variables[var_name]);
            }
        }
    }

    handle_read(line) {
        const read_pattern = /(\d+)\.r/;
        const read_match = line.split(';;')[0].trim().match(read_pattern);
        if (read_match) {
            const var_name = read_match[1];
            if (this.variables[var_name] !== undefined) {
                console.log(this.variables[var_name]);
            }
        }
    }

    handle_if(lines, i) {
        const if_pattern = /if\s+(\d+)\[(\d+)\]/;
        const if_match = lines[i].trim().match(if_pattern);
        if (if_match) {
            const var_name = if_match[1];
            const expected_value = parseInt(if_match[2]);

            const if_block = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('else') && !lines[i].trim().startsWith('end')) {
                if_block.push(lines[i].trim());
                i++;
            }

            const else_block = [];
            if (i < lines.length && lines[i].trim().startsWith('else')) {
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('end')) {
                    else_block.push(lines[i].trim());
                    i++;
                }
            }

            this.if_stmt(var_name, expected_value, if_block, else_block);
        }
        return i;
    }

    if_stmt(var_name, value, code_if, code_else = null) {
        if (this.variables[var_name] !== undefined) {
            if (parseInt(this.variables[var_name]) === value) {
                try {
                    for (const line of code_if) {
                        this.interpret_wst(line);
                    }
                } catch (e) {
                    console.log(`Error in if condition block: ${e}`);
                }
            } else if (code_else) {
                try {
                    for (const line of code_else) {
                        this.interpret_wst(line);
                    }
                } catch (e) {
                    console.log(`Error in else condition block: ${e}`);
                }
            }
        } else {
            console.log(`Error: Variable '${var_name}' not found.`);
        }
    }

    handle_add(line) {
        const add_pattern = /(\d+)\.add\[(.+?)\]/;
        const add_match = line.match(add_pattern);
        if (add_match) {
            const var_name = add_match[1];
            const numbers_str = add_match[2];
    
            if (this.variables[var_name] === undefined) {
                console.log(`Error: Variable ${var_name} not found.`);
                return;
            }
    
            if (numbers_str.includes('--')) {
                // Convert each number to a character, separated by TAB
                const characters = numbers_str.split('--').map(num => {
                    num = num.trim();
                    return String.fromCharCode(parseInt(num));
                });
                this.variables[var_name] = characters.join('\t'); // Tab-separated output
            } else if (numbers_str.includes('==')) {
                // Convert each number to a character, separated by NEWLINE
                const characters = numbers_str.split('==').map(num => {
                    num = num.trim();
                    return String.fromCharCode(parseInt(num));
                });
                this.variables[var_name] = characters.join('\n'); // Newline-separated output
            } else if (numbers_str.includes('=')) {
                // Convert each number to a character, separated by SPACE
                const characters = numbers_str.split('=').map(num => {
                    num = num.trim();
                    return String.fromCharCode(parseInt(num));
                });
                this.variables[var_name] = characters.join(' '); // Space-separated output
            } else {
                // Convert each number to a character and concatenate (ABC)
                const characters = numbers_str.split(',').map(num => {
                    num = num.trim();
                    return String.fromCharCode(parseInt(num));
                });
                this.variables[var_name] = characters.join(''); // Concatenated output
            }
        }
    }

    handle_set(line) {
        const set_pattern = /(\d+)\.set\[([^\]]+)\]/;
        const set_match = line.match(set_pattern);
        if (set_match) {
            const var_name = set_match[1];
            const numbers_str = set_match[2];

            const value = this.numbers_to_value(numbers_str);

            if (this.variables[var_name] !== undefined) {
                this.variables[var_name] = value;
            }
        }
    }

    handle_plus(line) {
        const plus_pattern = /(\d+)\.plus/;
        const plus_match = line.match(plus_pattern);
        if (plus_match) {
            const var_name = plus_match[1];
            if (this.variables[var_name] !== undefined) {
                this.variables[var_name] += this.variables[var_name];
            }
        }
    }

    handle_mul(line) {
        const mul_pattern = /(\d+)\.mul/;
        const mul_match = line.match(mul_pattern);
        if (mul_match) {
            const var_name = mul_match[1];
            if (this.variables[var_name] !== undefined) {
                this.variables[var_name] *= this.variables[var_name];
            }
        }
    }

    handle_div(line) {
        const div_pattern = /(\d+)\.div/;
        const div_match = line.match(div_pattern);
        if (div_match) {
            const var_name = div_match[1];
            if (this.variables[var_name] !== undefined) {
                this.variables[var_name] /= this.variables[var_name];
            }
        }
    }

    handle_min(line) {
        const min_pattern = /(\d+)\.min/;
        const min_match = line.match(min_pattern);
        if (min_match) {
            const var_name = min_match[1];
            if (this.variables[var_name] !== undefined) {
                this.variables[var_name] -= this.variables[var_name];
            }
        }
    }

    handle_function_call_with_args(line) {
        const func_call_pattern = /(\$\w+)\.\[([^\]]+)\]/;
        const func_call_match = line.match(func_call_pattern);
        if (func_call_match) {
            const func_name = func_call_match[1];
            const args_str = func_call_match[2];

            if (this.functions[func_name]) {
                const [bit_limit, func_body] = this.functions[func_name];
                const original_variables = { ...this.variables };
                const original_bit_limit = this.current_bit_limit;

                // Set input arguments
                const args = args_str.split(',').map(arg => parseInt(arg.trim()));
                this.variables['input'] = args;

                this.current_bit_limit = bit_limit;
                for (const func_line of func_body) {
                    this.interpret_wst(func_line);
                }

                // Restore original state
                this.variables = original_variables;
                this.current_bit_limit = original_bit_limit;
            }
        }
    }

    numbers_to_value(numbers_str) {
        const numbers = numbers_str.split(',');
        let value = 0;
        for (const num of numbers) {
            const trimmed_num = num.trim();
            if (/^\d+$/.test(trimmed_num)) {
                value += parseInt(trimmed_num);
            } else {
                console.log(`Error: Invalid number in operation: ${trimmed_num}`);
            }
        }
        return value;
    }

    handle_function(lines, i) {
        const func_pattern = /\(func (\$\w+)\s+\(result i%(\d+)\)\s*\(/;
        const func_match = lines[i].trim().match(func_pattern);
        if (func_match) {
            const func_name = func_match[1];
            const bit_limit = parseInt(func_match[2]);
            const func_body = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith(')')) {
                func_body.push(lines[i].trim());
                i++;
            }
            this.functions[func_name] = [bit_limit, func_body];
        }
        return i;
    }

    handle_return(line) {
        const return_pattern = /return\s+(.+)\.r/;
        const return_match = line.match(return_pattern);
        if (return_match) {
            const var_name = return_match[1];
            if (this.variables[var_name] !== undefined) {
                console.log(this.variables[var_name]);
            }
        }
    }
}

function read_wst_file(file_path) {
    return fs.readFileSync(file_path, 'utf8');
}

function main() {
    if (process.argv.length !== 3) {
        console.log("Usage: node script.js <filename.wst>");
        return;
    }

    const file_path = process.argv[2];
    if (!file_path.endsWith('.wst')) {
        console.log("Error: The file must have a .wst extension.");
        return;
    }

    if (!fs.existsSync(file_path)) {
        console.log(`Error: File ${file_path} does not exist.`);
        return;
    }

    const wst_content = read_wst_file(file_path);
    const interpreter = new WSTInterpreter();
    interpreter.interpret_wst(wst_content);
}

main();
