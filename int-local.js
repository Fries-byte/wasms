
    // web-interpreter.js - Browser-compatible WST interpreter
    let wstFILE = 'app'; // Name of the file, .wst shouldn't be included
    /*
    Local type of interpreter.
    *****
    Used for testing keywords before release
    or for local websites
    */ 
    class WSTInterpreter {
        constructor() {
            this.variables = {};
            this.custom_keywords = {};
            this.functions = {};
            this.current_bit_limit = null;
        }

        async load_wst_file(url) {
            const response = await fetch(url);
            const wst_content = await response.text();
            this.interpret_wst(wst_content);
        }

        interpret_wst(wst_content) {
            const lines = wst_content.split('\n');
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
                } else if (line.startsWith('w.->')) {
                    this.handle_open(line);
                }
                i++;
            }
        }    

        handle_local(line) {
            const var_pattern = /\(local (\d+) i\*(\d+)\)/;
            const var_match = line.match(var_pattern);
            if (var_match) {
                const var_name = var_match[1];
                const var_bits = parseInt(var_match[2]);
    
                if (this.current_bit_limit !== null && var_bits > this.current_bit_limit) {
                    console.log(`Error: Variable \${var_name} exceeds the bit limit of \${this.current_bit_limit}.`);
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

        handle_open(line) {
            const open_pattern = /w\.->\s*(\S+)/;
            const open_match = line.match(open_pattern);
            if (open_match) {
                const link = open_match[1];
                this.open(link);
            } else {
                console.log('Error: Invalid link format in w.->');
            }
        }
        
        open(link) {
            open(link, "_blank");
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
                // Compare the value of the variable with the expected value
                if (parseInt(this.variables[var_name]) === value) {
                    // Execute the code block inside the "if" condition
                    try {
                        for (const line of code_if) {
                            this.interpret_wst(line);
                        }
                    } catch (e) {
                        console.log(`Error in if condition block: ${e}`);
                    }
                } else if (code_else) {
                    // Execute the code block inside the "else" condition
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
                } else if (numbers_str == '$i-') {
                    // If there's no numbers after $i-, prompt the user for input (ASCII values)
                    const userInput = prompt(var_name);
                    if (userInput !== null) {
                        // Convert the comma-separated numbers into characters
                        const characters = userInput.split(',').map(num => {
                            num = num.trim();
                            return String.fromCharCode(parseInt(num));
                        });
                        this.variables[var_name] = characters.join(''); // Concatenate the characters
                    } else {
                        console.log('User cancelled the prompt.');
                    }
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

    // Initialize the interpreter and load a .wst file
    const interpreter = new WSTInterpreter();
    interpreter.load_wst_file(wstFILE + '.wst');
