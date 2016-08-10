var MAHALO = /^(node_modules|\.\.)\\mahalo\\/;

export default function({types: t}) {
    var skip;
    
    return {
        pre(file) {
            skip = MAHALO.test(file.opts.sourceFileName);
        },
        visitor: {
            /**
             * Regular assignments have to be rewritten to use mahalo.assign.
             */
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
                    value = operator === '=' ? node.right : t.binaryExpression(operator, arg, node.right);
                }
                
                assignment(path, state, arg, value);
            },
            
            /**
             * When a property or variable is incremented or decremented the
             * expression has to be rewritten to use mahalo.assign.
             */
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

            /**
             * The delete keyword has to be transformed as well
             * to use mahalo.assign.
             */
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
                    t.callExpression(assign(state), [
                        arg.object,
                        arg.computed ? arg.property : t.stringLiteral(arg.property.name)
                    ])
                );
            },
            
            
            /**
             * If a class extends mahalo.Route we have to add code splitting
             * when the static view property is a string.
             */
            Class(path) {
                if (skip || !extendsRoute(path)) {
                    return;
                }
                
                var node = path.node,
                    body = node.body.body,
                    i = body.length,
                    property,
                    template;
                
                while (i--) {
                    property = body[i];
                    
                    if (
                        t.isClassProperty(property) &&
                        property.static &&
                        property.key.name === 'view' &&
                        t.isStringLiteral(property.value)
                    ) {
                        property.value = viewFunction(property.value.value);
                        
                        break;
                    }
                }
            }
        }
    };
    
    /**
     * Replaces an assignment with a call to mahalo.assign.
     */
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
     * Creates a new function that returns a Promise that is
     * fulfilled when the view template has loaded.
     */
    function viewFunction(template) {
        return t.functionExpression(null, [], t.blockStatement([
                t.returnStatement(t.newExpression(t.identifier('Promise'), [
                    t.functionExpression(null, [t.identifier('resolve')], t.blockStatement([
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
                                        [t.callExpression(t.identifier('require'), [t.stringLiteral(template)])]
                                    ))
                                ],[]))
                            ]
                        ))
                    ], []))
                ]))
            ], []
        ));
    }
}


//////////


/**
 * Checks if a class extends mahalo.Route.
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
        name = source.value;
    
    if (name !== 'mahalo' && name !== 'mahalo/mahalo') {
        return false;
    }
    
    var specifiers = node.specifiers,
        i = specifiers.length,
        specifier;
    
    while (i--) {
        specifier = specifiers[i];
        
        if (specifier === binding.path.node && specifier.imported.name === 'Route') {
            return true;
        }
    }
    
    return false;
}

/**
 * Ensures that mahalo.assign is imported.
 */
function assign(state) {
    return state.addImport('mahalo', 'assign', 'assign');
}