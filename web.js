const wasms = `

`;

class WSTInterpreter {
    constructor() {
        this.variables = {};
        this.custom_keywords = {};
        this.functions = {};
        this.current_bit_limit = null;
    }

    load_mod(mod_content) {
        const mod_pattern = /keyword\.(\$\w+\$)\.(\$\w+\$) => \(local \1 \2\)/g;
        const mod_matches = [...mod_content.matchAll(mod_pattern)];

        for (const [_, word, type_] of mod_matches) {
            this.custom_keywords[word] = type_;
        }
    }

    load_wasms() {
        this.load_mod(wasms);
    }

    interpret_wst(wst_content) {
        this.load_wasms(); // Ensure wasms are loaded
        const lines = wst_content.split('\n');
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line.startsWith('(local')) {
                this.handle_local(line);
            } else if (line.includes('.set[')) {
                this.handle_set(line);
            } else if (line.includes('.add[')) {
                this.handle_add(line);
            } else if (line.includes('.plus')) {
                this.handle_plus(line);
            } else if (line.includes('.mul')) {
                this.handle_mul(line);
            } else if (line.includes('.div')) {
                this.handle_div(line);
            } else if (line.includes('.min')) {
                this.handle_min(line);
            } else if (line.startsWith('if')) {
                i = this.handle_if(lines, i);
            } else if (line.startsWith('return')) {
                this.handle_return(line);
            }
            i++;
        }
    }

    handle_local(line) {
        const var_pattern = /\(local (\d+) i\*(\d+)\)/;
        const var_match = line.match(var_pattern);
        if (var_match) {
            const var_name = var_match[1];
            this.variables[var_name] = 0;
        }
    }

    handle_set(line) {
        const set_pattern = /(\d+)\.set\[([^\]]+)\]/;
        const set_match = line.match(set_pattern);
        if (set_match) {
            const var_name = set_match[1];
            this.variables[var_name] = set_match[2];
        }
    }

    handle_add(line) {
        const add_pattern = /(\d+)\.add\[(.+?)\]/;
        const add_match = line.match(add_pattern);
        if (add_match) {
            const var_name = add_match[1];
            const value = parseInt(add_match[2]);
            if (!isNaN(value)) {
                this.variables[var_name] = (this.variables[var_name] || 0) + value;
            }
        }
    }

    handle_if(lines, i) {
        const if_pattern = /if\s+(\d+)\[(\d+)\]/;
        const if_match = lines[i].trim().match(if_pattern);
        if (if_match) {
            const var_name = if_match[1];
            const expected_value = parseInt(if_match[2]);
            
            if (this.variables[var_name] == expected_value) {
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('end')) {
                    this.interpret_wst(lines[i].trim());
                    i++;
                }
            }
        }
        return i;
    }

    handle_return(line) {
        const return_pattern = /return\s+(\d+)\.r/;
        const return_match = line.match(return_pattern);
        if (return_match) {
            const var_name = return_match[1];
            console.log(this.variables[var_name] || 'Undefined');
        }
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.wst')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const wst_content = e.target.result;
            const interpreter = new WSTInterpreter();
            interpreter.interpret_wst(wst_content);
        };
        reader.readAsText(file);
    } else {
        console.log("Error: The file must have a .wst extension.");
    }
}
