// @todo: Include access-prepare in this one and add update and register functions to the file
export default function ({Plugin, types: t}) {
    var hasComputedProperties,
		computedObserver,
        register,
        update;

    return new Plugin('access', {
        visitor: {
            AssignmentExpression(node, parent, scope, file) {
                var left = node.left;

                if (left.type === 'MemberExpression') {
                    var literal = left.computed ? left.property : t.literal(left.property.name),
                        opLength = node.operator.length,
                        val = opLength > 1 ? t.binaryExpression(node.operator.substr(0, opLength - 1), left, node.right) : node.right;

                    return t.callExpression(t.memberExpression(left.object, t.identifier('_set')), [literal, val]);
                } else if (hasComputedProperties && !node.updated) {
                    node.updated = true;
                    return t.callExpression(update, [left, t.literal(left.name), node]);
                }
            },
			
            UpdateExpression(node) {
                var arg = node.argument;

                if (arg.type === 'MemberExpression') {
                    var literal = arg.computed ? arg.property : t.literal(arg.property.name);

                    return t.callExpression(t.memberExpression(arg.object, t.identifier('_set')), [literal, t.binaryExpression(node.operator[0], arg, t.literal(1))]);
                } else if (hasComputedProperties && !node.updated) {
                    node.updated = true;
                    return t.callExpression(update, [arg, t.literal(arg.name), node]);
                }
            },
			
            UnaryExpression(node) {
                var arg = node.argument;

                if (arg.type === 'MemberExpression' && node.operator === 'delete') {
                    var literal = arg.computed ? arg.property : t.literal(arg.property.name);

                    return t.callExpression(t.memberExpression(arg.object, t.identifier('_del')), [literal]);
                }
            },
			
            Identifier(node, parent, scope) {
                if (!hasComputedProperties) {
                    return;
                }

                var fn = scope.block,
                    name;
				
                if (!t.isFunction(fn) || parent === fn || scope.hasOwnBinding(node.name) || !t.isMemberExpression(parent)) {
					return;
				}
				
                name = members(parent);

                fn.watch = fn.watch || [];
                fn.watch.indexOf(name) < 0 && fn.watch.push(name);
            },
			
            Function: {
                exit(node, parent) {
                    if (!hasComputedProperties || !node.watch || node.updated || t.isMemberExpression(parent)) {
						return;
					}

					if (t.isMethodDefinition(parent) && parent.key.name === 'constructor') {
						return;
					}

					node.updated = true;

					var args = [node],
						scope = [],
						members = [];

					node.watch.forEach(function (name) {
						var parts = name.split('.'),
							obj = parts.shift();

						parts = parts.join('.');
						
						if (parts === '_set') {
							return;
						}
						
						if (obj === 'this') {
							members.push(t.literal(parts));
						} else {
							scope.push(t.arrayExpression([
								t.identifier(obj),
								t.literal(obj),
								t.literal(parts)
							]));
						}
					});

					args.push(t.arrayExpression(scope));
					members.length && args.push(t.arrayExpression(members));
					
					if (
						!t.isFunctionDeclaration(node) &&
						!t.isExportNamedDeclaration(parent) &&
						!t.isExportDefaultDeclaration(parent)
					) {
						return t.callExpression(register, args);
					}
					
					if (
						t.isExportNamedDeclaration(parent) ||
						t.isExportDefaultDeclaration(parent)
					) {
						args[0] = parent.declaration.id;
						parent.register = t.callExpression(register, args);
					} else {
						args[0] = node.id;
						this.insertBefore(t.expressionStatement(t.callExpression(register, args)));
					}
				}
            },
			
			'ExportNamedDeclaration|ExportDefaultDeclaration': {
				exit(node) {
					
					if (node.register) {
						this.insertBefore(t.expressionStatement(node.register));
					}
				}
			},
			
            Program(node, parent, scope, file) {
                hasComputedProperties = node.hasComputedProperties;

                if (hasComputedProperties) {
					computedObserver = file.addImport('access-core/utils/computedObserver');
					register = scope.generateUidIdentifier('register');
                    update = scope.generateUidIdentifier('update');
					
					var observer = scope.generateUidIdentifier('observer');

					scope.push({
						id: observer,
						init: t.callExpression(t.unaryExpression('new', computedObserver), [])
					});

					scope.push({
						id: register,
						init: t.memberExpression(observer, t.identifier('register'))
					});

					scope.push({
						id: update,
						init: t.memberExpression(observer, t.identifier('update'))
					});
                }
            }
        }
    });

    function members(exp) {
        var name = exp.object.name || 'this';

        exp = exp.property;

        while (t.isMemberExpression(exp)) {
            name += property(exp.computed, exp.property);
            exp = exp.property;
        }

        return name + property(!t.isIdentifier(exp), exp);
    }

    function property(computed, property) {
        if (computed) {
            if (t.isLiteral(property)) {
                return '.' + property.value.replace('.', '..');
            }

            return '.@';
        }

        return '.' + property.name;
    }
}