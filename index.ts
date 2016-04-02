var MAHALO = /^(node_modules|\.\.)\\mahalo\\/,
	METHODS = [
		// Array
		'copyWithin',
		'entries',
		'fill',
		'find',
		'findIndex',
		'keys',
		'values',
		
		// String
		'codePointAt',
		'endsWith',
		'includes',
		'repeat',
		'startsWith'
	];

export default function({types: t}) {
	var first = true,
		route,
		skip;
	
    return {
		pre(file) {
			skip = MAHALO.test(file.opts.sourceFileName);
		},
        visitor: {
			// Assigment rewriting
			
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
            },
			
			
			// Array and String instance methods rewriting for babel-runtime
			
			CallExpression(path, state) {
				var node = path.node,
					callee = node.callee,
					property;
				
				if (!t.isMemberExpression(callee)) {
					return;
				}
				
				property = callee.property;
				
				if (callee.computed || METHODS.indexOf(property.name) < 0) {
					return;
				}
				
				path.replaceWith(
					t.callExpression(
						callMethod(state),
						[
							callee.object,
							t.stringLiteral(property.name),
							t.arrayExpression(node.arguments)
						]
					)
				);
			},
			
			
			// Code splitting for routes
			
			Class(path) {
				if (!extendsRoute(path)) {
					return;
				}
				
				var node = path.node,
					body = node.body.body,
					i = body.length,
					property,
					template;
				
				while (i--) {
					property = body[i];
					
					if (t.isClassProperty(property) && property.static && property.key.name === 'view' && t.isStringLiteral(property.value)) {
						template = property.value.value;
						
						property.value = t.functionExpression(null, [], t.blockStatement([
								t.returnStatement(t.newExpression(t.identifier('Promise'), [
									t.functionExpression(null,[t.identifier('resolve')], t.blockStatement([
										t.expressionStatement(t.callExpression(
											t.memberExpression(
												t.identifier('require'),
												t.identifier('ensure')
											),
											[
												t.arrayExpression([t.stringLiteral(template)]),
												t.functionExpression(null, [t.identifier('require')], t.blockStatement([
													t.expressionStatement(t.callExpression(
														t.identifier('resolve'),
														[t.callExpression(t.identifier('require'),[t.stringLiteral(template)])]
													))
												],[]))
											]
										))
									], []))
								]))
							], []
						));
						
						i = 0;
					}
				}
			},
			
			
			// Polyfilling for IE < 11
			
			Program: {
				exit(path, state) {
					if (first) {
						state.addImport('mahalo/polyfill/set-prototype-of', null, null);
						state.addImport('mahalo/polyfill/get-prototype-of', null, null);
						first = false;
					}
					
					route = null;
				}
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
	
	/**
	 * Checks if a class extends Route
	 */
	function extendsRoute(path) {
		var node = path.node,
			superClass = node.superClass;
		
		if (!superClass) {
			return false;
		}
		
		var binding = path.scope.getBinding(superClass.name);
		
		if (binding.kind !== 'module') {
			return false;
		}
		
		node = binding.path.parent;
		
		var	source = node.source,
			name = source.value,
			checkImportSpecifier = name === 'mahalo' || name === 'mahalo/mahalo',
			checkDefaultSpecifier = name === 'mahalo/components/route';
		
		if (!checkImportSpecifier) {
			return false;
		}
		
		var specifiers = node.specifiers,
			i = specifiers.length,
			specifier;
		
		while (i--) {
			specifier = specifiers[i];
			
			// @todo: Make default import work as well
			if (specifier === binding.path.node && specifier.imported.name === 'Route') {
				return true;
			}
		}
		
		return false;
	}
}

function assign(state) {
	return state.addImport('mahalo/change-detection/assign', 'default', 'assign');
}

function callMethod(state) {
	return state.addImport('mahalo/polyfill/call-method', 'default', 'callMethod');
}