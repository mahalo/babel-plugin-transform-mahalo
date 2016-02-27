export default function ({types: t}) {
    var update;

    return {
        visitor: {
            'AssignmentExpression|UpdateExpression'(path) {
                var node = path.node,
					arg = node.argument;

				node.updated = true;
				
                if (t.isMemberExpression(arg)) {
                    var literal = arg.computed ? arg.property : t.literal(arg.property.name);

                    return t.callExpression(update, [arg.object, literal, node]);
                } else {
                    return t.callExpression(update, [node]);
                }
            },
			
            UnaryExpression(path) {
                var node = path.node,
					arg = node.argument;

                if (t.isMemberExpression(arg) && node.operator === 'delete') {
                    var literal = arg.computed ? arg.property : t.literal(arg.property.name);

                    return t.callExpression(update, [arg.object, literal]);
                }
            },
			
            Program(path) {
                update = path.file.addImport('access-core/observer/update');
            }
        }
    };
}