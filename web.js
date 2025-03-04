class WSTInterpreter {
    constructor() {
        this.variables = {};
        this.custom_keywords = {};
        this.functions = {};
        this.current_bit_limit = null;
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
            } else if (line.startsWith('end')) {
                // No action needed for end
            } else if (line.startsWith('(func')) {
                i = this.handle_function?.(lines, i) ?? i;
            } else if (line.startsWith('return')) {
                this.handle_return(line);
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

    handle_set_char(line) {
        const match = line.match(/(\d+)\.set\*char/);
        if (match) {
            const var_name = match[1];
            if (this.variables[var_name] !== undefined) {
                this.variables[var_name] = String.fromCharCode(this.variables[var_name]);
            }
        }
    }

    handle_read(line) {
        const match = line.match(/(\d+)\.r/);
        if (match) {
            const var_name = match[1];
            if (this.variables[var_name] !== undefined) {
                console.log(this.variables[var_name]);
            }
        }
    }

    handle_if(lines, i) {
        const if_match = lines[i].trim().match(/if\s+(\d+)\[(\d+)\]/);
        if (if_match) {
            const var_name = if_match[1];
            const expected_value = parseInt(if_match[2]);
            const if_block = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith('else') && !lines[i].trim().startsWith('end')) {
                if_block.push(lines[i].trim());
                i++;
            }
            if (this.variables[var_name] === expected_value) {
                if_block.forEach(line => this.interpret_wst(line));
            }
        }
        return i;
    }

    handle_add(line) {
        const match = line.match(/(\d+)\.add\[(.+?)\]/);
        if (match) {
            const var_name = match[1];
            if (this.variables[var_name] !== undefined) {
                const numbers = match[2].split(',').map(n => parseInt(n.trim()));
                this.variables[var_name] = numbers.reduce((a, b) => a + b, 0);
            }
        }
    }
}

// Usage example in the browser
function runWSTCode(code) {
    const interpreter = new WSTInterpreter();
    interpreter.interpret_wst(code);
}


