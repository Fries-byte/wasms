import sys
import struct

def parse_asms(file_content):
    commands = []
    lines = file_content.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('(') and line.endswith(')'):
            parts = line[1:-1].split()
            if len(parts) >= 3:
                command_type = parts[1]
                if command_type == ':func':
                    func_name = parts[0]
                    code = ' '.join(parts[2:]).strip('()')
                    commands.append(('func', func_name, code))
                elif command_type == ':data':
                    var_name = parts[0]
                    value = ' '.join(parts[2:]).strip('(% )')
                    commands.append(('data', var_name, value))
                elif command_type == ':read':
                    var_name = parts[0]
                    commands.append(('read', var_name))
                elif command_type == ':math':
                    var_name = parts[0]
                    expression = ' '.join(parts[2:]).strip('()')
                    commands.append(('math', var_name, expression))
    return commands

def compile_to_asmc(commands, output_file):
    with open(output_file, 'wb') as f:
        for command in commands:
            if command[0] == 'func':
                f.write(struct.pack('B', 0x01))  # Function type
                f.write(struct.pack('B', len(command[1])))  # Length of name
                f.write(command[1].encode('utf-8'))  # Name
                f.write(struct.pack('B', len(command[2])))  # Length of code
                f.write(command[2].encode('utf-8'))  # Code
            elif command[0] == 'data':
                f.write(struct.pack('B', 0x02))  # Data type
                f.write(struct.pack('B', len(command[1])))  # Length of name
                f.write(command[1].encode('utf-8'))  # Name
                f.write(struct.pack('B', len(command[2])))  # Length of value
                f.write(command[2].encode('utf-8'))  # Value
            elif command[0] == 'read':
                f.write(struct.pack('B', 0x03))  # Read type
                f.write(struct.pack('B', len(command[1])))  # Length of name
                f.write(command[1].encode('utf-8'))  # Name
            elif command[0] == 'math':
                f.write(struct.pack('B', 0x04))  # Math type
                f.write(struct.pack('B', len(command[1])))  # Length of name
                f.write(command[1].encode('utf-8'))  # Name
                f.write(struct.pack('B', len(command[2])))  # Length of expression
                f.write(command[2].encode('utf-8'))  # Expression

def main(input_file, output_file):
    with open(input_file, 'r') as f:
        content = f.read()
    commands = parse_asms(content)
    compile_to_asmc(commands, output_file)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python compiler.py input.asms output.asmc")
        sys.exit(1)
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    main(input_file, output_file)