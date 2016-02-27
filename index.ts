export default function({types: t}) {
    return {
        visitor: {
            AssignmentExpression(path, state) {
				assignment(path, state, path.node.left);
			},
			
            UpdateExpression(path, state) {
				assignment(path, state, path.node.argument);
			},

            UnaryExpression(path, state) {
                var node = path.node,
					arg = node.argument;

				if (node.updated || !t.isMemberExpression(arg) || node.operator !== 'delete') {
					return;
				}
				
				node.updated = true;
				
				path.replaceWith(
					t.callExpression(
						update(state),
						[
							arg.object,
							arg.computed ? arg.property : t.stringLiteral(arg.property.name)
						]
					)
				);
            }
        }
    };
	
	function assignment(path, state, arg) {
		var node = path.node;

		if (node.updated) {
			return;
		}
		
		node.updated = true;
		
		var params = [node];

		if (t.isMemberExpression(arg)) {
			if (t.isIdentifier(arg.object) && arg.object.name === 'exports') {
				return;
			}
			
			params.unshift(
				arg.object,
				arg.computed ? arg.property : t.stringLiteral(arg.property.name)
			);
		}
		
		path.replaceWith(
			t.callExpression(
				update(state),
				params
			)
		);
	}
}

function update(state) {
	return state.addImport('access-core/observer/update', 'default');
}