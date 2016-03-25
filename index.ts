export default function({types: t}) {
	var skip;
	
    return {
		pre(file) {
			if (/^(node_modules|\.\.)\\mahalo\\/.test(file.opts.sourceFileName)) {
				skip = true;
			}
		},
        visitor: {
            AssignmentExpression(path, state) {
				if (skip) {
					return;
				}
				
				var node = path.node,
					arg = node.left,
					value = node,
					operator;
				
				if (t.isMemberExpression(arg)) {
					operator = node.operator[0];
					
					if (operator !== '=') {
						value = t.binaryExpression(operator, arg, node.right);
					} else {
						value = node.right;
					}
				}
				
				assignment(path, state, arg, value);
			},
			
            UpdateExpression(path, state) {
				if (skip) {
					return;
				}
				
				var node = path.node,
					arg = node.argument,
					value = node;
				
				if (t.isMemberExpression(arg)) {
					value = t.binaryExpression(node.operator[0], arg, t.numericLiteral(1));
				}
				
				assignment(path, state, arg, value);
			},

            UnaryExpression(path, state) {
				if (skip) {
					return;
				}
				
                var node = path.node,
					arg = node.argument;

				if (!t.isMemberExpression(arg) || node.operator !== 'delete') {
					return;
				}
				
				path.replaceWith(
					t.callExpression(
						assign(state),
						[
							arg.object,
							arg.computed ? arg.property : t.stringLiteral(arg.property.name)
						]
					)
				);
            }
        }
    };
	
	function assignment(path, state, arg, value) {
		var node = path.node,
			params;

		if (node.updated) {
			return;
		}
		
		params = [];
		node.updated = true;
		
		if (t.isMemberExpression(arg)) {
			if (t.isIdentifier(arg.object) && arg.object.name === 'exports') {
				return;
			}
			
			params.push(
				arg.object,
				arg.computed ? arg.property : t.stringLiteral(arg.property.name)
			);
		}
		
		params.push(value);
		
		path.replaceWith(t.callExpression(assign(state), params));
	}
}

function assign(state) {
	return state.addImport('mahalo/change-detection/property', 'assign', 'assign');
}