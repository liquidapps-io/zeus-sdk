var parser = (function() {
  "use strict";

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  peg$SyntaxError.buildMessage = function(expected, found) {
    var DESCRIBE_EXPECTATION_FNS = {
          literal: function(expectation) {
            return "\"" + literalEscape(expectation.text) + "\"";
          },

          "class": function(expectation) {
            var escapedParts = "",
                i;

            for (i = 0; i < expectation.parts.length; i++) {
              escapedParts += expectation.parts[i] instanceof Array
                ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
                : classEscape(expectation.parts[i]);
            }

            return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
          },

          any: function(expectation) {
            return "any character";
          },

          end: function(expectation) {
            return "end of input";
          },

          other: function(expectation) {
            return expectation.description;
          }
        };

    function hex(ch) {
      return ch.charCodeAt(0).toString(16).toUpperCase();
    }

    function literalEscape(s) {
      return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g,  '\\"')
        .replace(/\0/g, '\\0')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
        .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
    }

    function classEscape(s) {
      return s
        .replace(/\\/g, '\\\\')
        .replace(/\]/g, '\\]')
        .replace(/\^/g, '\\^')
        .replace(/-/g,  '\\-')
        .replace(/\0/g, '\\0')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
        .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
    }

    function describeExpectation(expectation) {
      return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
    }

    function describeExpected(expected) {
      var descriptions = new Array(expected.length),
          i, j;

      for (i = 0; i < expected.length; i++) {
        descriptions[i] = describeExpectation(expected[i]);
      }

      descriptions.sort();

      if (descriptions.length > 0) {
        for (i = 1, j = 1; i < descriptions.length; i++) {
          if (descriptions[i - 1] !== descriptions[i]) {
            descriptions[j] = descriptions[i];
            j++;
          }
        }
        descriptions.length = j;
      }

      switch (descriptions.length) {
        case 1:
          return descriptions[0];

        case 2:
          return descriptions[0] + " or " + descriptions[1];

        default:
          return descriptions.slice(0, -1).join(", ")
            + ", or "
            + descriptions[descriptions.length - 1];
      }
    }

    function describeFound(found) {
      return found ? "\"" + literalEscape(found) + "\"" : "end of input";
    }

    return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
  };

  function peg$parse(input, options) {
    options = options !== void 0 ? options : {};

    var peg$FAILED = {},

        peg$startRuleIndices = { CompilationUnit: 0 },
        peg$startRuleIndex   = 0,

        peg$consts = [
          function(pack, imports, types) {
                return {
                  node:    'CompilationUnit',
                  types:    skipNulls(types),
                  package:  pack,
                  imports:  skipNulls(imports)
                };
              },
          function(leadComments, annot, name) {
                return {
                  node:       'PackageDeclaration',
                  name:        name,
                  annotations: annot,
                  comments:    leadComments
                };
              },
          function(stat, name, asterisk) {
                return {
                  node:    'ImportDeclaration',
                  name:     name,
                  static:   !!stat,
                  onDemand: !!extractOptional(asterisk, 1)
                };
              },
          function() { return null; },
          function(leadComments, modifiers, type) { return mergeProps(type, { modifiers: modifiers, comments: leadComments }); },
          function(id, gen, ext, impl, body) {
                return {
                  node:               'TypeDeclaration',
                  name:                id,
                  superInterfaceTypes: extractOptionalList(impl, 1),
                  superclassType:      extractOptional(ext, 1),
                  bodyDeclarations:    body,
                  typeParameters:      optionalList(gen),
                  interface:           false
                };
              },
          function(decls) { return skipNulls(decls); },
          function(modifier, body) {
                return {
                  node:     'Initializer',
                  body:      body,
                  modifiers: modifier === null ? [] : [makeModifier('static')]
                };
              },
          function(modifiers, member) { return mergeProps(member, { modifiers: modifiers }); },
          function(comment) { return { node: "EndOfLineComment", comment: comment.value }; },
          function(comment) { return { node: "TraditionalComment", comment: comment.value }; },
          function(comment) { return { node: "JavaDocComment", comment: comment.value }; },
          /^[\r\n\f]/,
          peg$classExpectation(["\r", "\n", "\f"], false, false),
          function() { return { node: "LineEmpty" }; },
          function(params, rest) { 
                return mergeProps(rest, {
                  node:          'MethodDeclaration',
                  typeParameters: params
                });
              },
          function(type, id, rest) {
                return mergeProps(rest, {
                  node:          'MethodDeclaration',
                  returnType2:    type,
                  name:           id,
                  typeParameters: []
                });
              },
          function(type, decls) {
                return {
                  node:     'FieldDeclaration',
                  fragments: decls,
                  type:      type
                };
              },
          function(id, rest) {
                return mergeProps(rest, {
                  node:       'MethodDeclaration',
                  returnType2: makePrimitive('void'),
                  name:        id,
                  constructor: false
                });
              },
          function(id, rest) { 
                return mergeProps(rest, {
                  node:           'MethodDeclaration',
                  name:            id,
                  typeParameters:  []
                });
              },
          function() { return makePrimitive('void'); },
          function(type, id, rest) {
                return mergeProps(rest, {
                  returnType2: type,
                  name:        id
                });
              },
          function(id, rest) { return mergeProps(rest, { name: id }); },
          function(params, dims, throws) { return null; },
          function(params, dims, throws, body) {
                return {
                  parameters:       params,
                  thrownExceptions: extractThrowsClassType(extractOptionalList(throws, 1)),
                  extraDimensions:  dims.length,
                  body:             body,
                  constructor:      false
                };
              },
          function(params, throws) { return null; },
          function(params, throws, body) {
                return {
                  parameters:       params,
                  thrownExceptions: extractThrowsClassType(extractOptionalList(throws, 1)),
                  body:             body,
                  extraDimensions:  0,
                  typeParameters:   []
                };
              },
          function(params, throws, body) {
                return {
                  parameters:       params,
                  thrownExceptions: extractThrowsClassType(extractOptionalList(throws, 1)),
                  body:             body,
                  returnType2:      null,
                  constructor:      true,
                  extraDimensions:  0
                };
              },
          function(id, gen, ext, body) {
                return {
                    node:               'TypeDeclaration',
                    name:                id,
                    superInterfaceTypes: extractOptionalList(ext, 1),
                    superclassType:      null,
                    bodyDeclarations:    body,
                    typeParameters:      optionalList(gen),
                    interface:           true
                  };
              },
          function(type, id, rest) {
                if (rest.node === 'FieldDeclaration') {
                  rest.fragments[0].name = id;
                  return mergeProps(rest, { type: type });
                } else {
                  return mergeProps(rest, { 
                    returnType2:    type, 
                    name:           id,
                    typeParameters: []
                  });
                }
              },
          function(rest) { return { node: 'FieldDeclaration', fragments: rest }; },
          function(params, dims, throws) {
                return {
                  node:            'MethodDeclaration',
                  parameters:       params,
                  thrownExceptions: extractThrowsClassType(extractOptionalList(throws, 1)),
                  extraDimensions:  dims.length,
                  body:             null,
                  constructor:      false
                };
              },
          function(params) { return makePrimitive('void'); },
          function(params, type, id, rest) {
                return mergeProps(rest, { 
                  returnType2:    type, 
                  name:           id, 
                  typeParameters: params 
                });
              },
          function(params, throws) {
                return {
                  node:            'MethodDeclaration',
                  parameters:       params,
                  thrownExceptions: extractThrowsClassType(extractOptionalList(throws, 1)),
                  returnType2:      makePrimitive('void'),
                  extraDimensions:  0,
                  typeParameters:   [],
                  body:             null,
                  constructor:      false
                };
              },
          function(first, rest) { return buildList(first, rest, 1); },
          function(dims, init) { 
                  return {
                    node:           'VariableDeclarationFragment',
                    extraDimensions: dims.length,
                    initializer:     init
                }; 
              },
          function(name, impl, eb) {
                return mergeProps(eb, {
                  node:               'EnumDeclaration',
                  name:                name,
                  superInterfaceTypes: extractOptionalList(impl, 1)
                });
              },
          function(consts, body) {
                return {
                  enumConstants:    optionalList(consts),
                  bodyDeclarations: optionalList(body)
                };
              },
          function(annot, name, args, cls) {
                return {
                  node:                     'EnumConstantDeclaration',
                  anonymousClassDeclaration: cls === null ? null : {
                    node:             'AnonymousClassDeclaration',
                    bodyDeclarations:  cls
                  },
                  arguments:                 optionalList(args),
                  modifiers:                 annot, 
                  name:                      name
                };
              },
          function(decl) { return decl; },
          function() { return makeModifier('final'); },
          function(modifiers, type, decls) {
                return {
                  node:        'VariableDeclarationStatement',
                  fragments:    decls,
                  modifiers:    modifiers,
                  type:         type
                };
              },
          function(name, dims, init) {
                return {
                  node:           'VariableDeclarationFragment',
                  name:            name,
                  extraDimensions: dims.length,
                  initializer:     extractOptional(init, 1)
                };
              },
          function(params) { return optionalList(params); },
          function(modifiers, type, decl) { 
                return mergeProps(decl, {
                  type:        type,
                  modifiers:   modifiers,
                  varargs:     false,
                  initializer: null
                });
              },
          function(modifiers, type, decl) { 
                return mergeProps(decl, {
                  type:        type,
                  modifiers:   modifiers,
                  varargs:     true,
                  initializer: null
                });
              },
          function(first, rest, last) { return buildList(first, rest, 1).concat(extractOptionalList(last, 1)); },
          function(last) { return [last]; },
          function(id, dims) { 
                return { 
                  node:           'SingleVariableDeclaration', 
                  name:            id, 
                  extraDimensions: dims.length 
                }; 
              },
          function(statements) { 
                return {
                  node:      'Block',
                  statements: statements
                }
              },
          function(modifiers, decl) { 
                return { 
                  node:       'TypeDeclarationStatement', 
                  declaration: mergeProps(decl,  { modifiers: modifiers }) 
                }; 
              },
          function(expr, message) { 
                return { 
                  node:      'AssertStatement', 
                  expression: expr,
                  message:    extractOptional(message, 1)
                }; 
              },
          function(expr, then, alt) { 
                return { 
                  node:         'IfStatement', 
                  elseStatement: extractOptional(alt, 1), 
                  thenStatement: then,
                  expression:    expr.expression,   
                }; 
              },
          function(init, expr, up, body) { 
                return {
                  node:        'ForStatement',
                  initializers: optionalList(init),
                  expression:   expr,
                  updaters:     optionalList(up),
                  body:         body
                };
              },
          function(param, expr, statement) {       
                return {
                  node:      'EnhancedForStatement',
                  parameter:  param,
                  expression: expr,
                  body:       statement
                }; 
              },
          function(expr, body) { 
                return { 
                  node:      'WhileStatement', 
                  expression: expr.expression, 
                  body:       body 
                };
              },
          function(statement, expr) { 
                return { 
                  node:      'DoStatement', 
                  expression: expr.expression, 
                  body:       statement 
                };  
              },
          function(first, rest, body, cat, fin) { 
                return mergeProps(makeCatchFinally(cat, fin), {
                  node:        'TryStatement',
                  body:         body,
                  resources:    buildList(first, rest, 1)
                });
              },
          function(body, cat, fin) { return makeCatchFinally(cat, fin); },
          function(body, fin) { return makeCatchFinally([], fin); },
          function(body, rest) { 
                return mergeProps(rest, {
                  node:        'TryStatement',
                  body:         body,
                  resources:    []
                });
              },
          function(expr, cases) { return { node: 'SwitchStatement', statements: cases, expression: expr.expression }; },
          function(expr, body) { return { node: 'SynchronizedStatement', expression: expr.expression, body: body } },
          function(expr) { return { node: 'ReturnStatement', expression: expr } },
          function(expr) { return { node: 'ThrowStatement', expression: expr }; },
          function(id) { return { node: 'BreakStatement', label: id }; },
          function(id) { return { node: 'ContinueStatement', label: id }; },
          function() { return { node: 'EmptyStatement' }; },
          function(statement) { return statement; },
          function(id, statement) { return { node: 'LabeledStatement', label: id, body: statement }; },
          function(modifiers, type, decl, expr) { 
                var fragment = mergeProps(decl, { initializer: expr });
                fragment.node = 'VariableDeclarationFragment';
                return {
                  node:     'VariableDeclarationExpression',
                  modifiers: modifiers,
                  type:      type,
                  fragments: [fragment]
                }; 
              },
          function(modifiers, first, rest, decl, body) {
                return {
                  node:       'CatchClause',
                  body:        body,
                  exception:   mergeProps(decl, {
                    modifiers:   modifiers,
                    initializer: null,
                    varargs:     false,
                    type:        rest.length ? { 
                      node: 'UnionType', 
                      types: buildList(first, rest, 1) 
                      } : first
                  })
                };
              },
          function(block) { return block; },
          function(blocks) { return [].concat.apply([], blocks); },
          function(expr, blocks) { return [{ node: 'SwitchCase', expression: expr }].concat(blocks); },
          function(expr) { return expr; },
          function(modifiers, type, decls) { 
                return [{
                  node:     'VariableDeclarationExpression',
                  modifiers: modifiers,
                  fragments: decls,
                  type:      type
                }]; 
              },
          function(first, rest) { return extractExpressions(buildList(first, rest, 1)); },
          function(expr) { 
                switch(expr.node) {
                  case 'SuperConstructorInvocation':
                  case 'ConstructorInvocation':
                    return expr;
                  default:
                    return { 
                      node:      'ExpressionStatement', 
                      expression: expr 
                    };  
                }
              },
          function(left, op, right) {
                return {
                  node:         'Assignment',
                  operator:      op[0] /* remove ending spaces */,
                  leftHandSide:  left,
                  rightHandSide: right
                };
              },
          function(left) { return { node: "SimpleName", identifier: "new" }; },
          function(left, right) {
                return {
                  node: 'MethodReference',
                  class: left,
                  method: right
                };
              },
          function(args, body) {
                return {
                  node: 'LambdaExpression',
                  args: args,
                  body: body
                };
              },
          function(id, body) {
                return {
                  node: 'LambdaExpression',
                  args: [id],
                  body: body
                };
              },
          function(body) { return body; },
          function(statement) {
                return {
                  node:      'Block',
                  statements: [statement]
                }
              },
          function(expr, then, alt) {
                return {
                  node:          'ConditionalExpression',
                  expression:     expr,
                  thenExpression: then,
                  elseExpression: alt
                };
              },
          function(first, rest) { return buildInfixExpr(first, rest); },
          function(first, rest) {
                return buildTree(first, rest, function(result, element) {
                  return element[0][0] === 'instanceof' ? {
                    node:        'InstanceofExpression',
                    leftOperand:  result,
                    rightOperand: element[1]
                  } : {
                    node:        'InfixExpression',
                    operator:     element[0][0], // remove ending Spacing
                    leftOperand:  result,
                    rightOperand: element[1]
                  };
                });
              },
          function(operator, operand) {
                return operand.node === 'NumberLiteral' && operator === '-' && 
                  (operand.token === '9223372036854775808L' || 
                   operand.token === '9223372036854775808l' ||
                   operand.token === '2147483648') 
                  ? { node: 'NumberLiteral', token: text() }
                  : { 
                    node:    'PrefixExpression', 
                    operator: operator, 
                    operand:  operand
                  };
              },
          function(expr) {
                return {
                  node:      'CastExpression',
                  type:       expr[1],     
                  expression: expr[3]
                };
              },
          function(arg, sel, sels, operator) { 
                return operator.length > 1 ? TODO(/* JLS7? */) : {
                  node:    'PostfixExpression', 
                  operator: operator[0], 
                  operand:  buildSelectorTree(arg, sel, sels)
                };
              },
          function(arg, sel, sels) { return buildSelectorTree(arg, sel, sels); },
          function(arg, operator) { 
                return operator.length > 1 ? TODO(/* JLS7? */) : {
                  node:    'PostfixExpression', 
                  operator: operator[0], 
                  operand:  arg
                };
              },
          function(args, args_r) { return { node: 'ConstructorInvocation', arguments: args_r, typeArguments: [] }; },
          function(args, ret) { 
                if (ret.typeArguments.length) return TODO(/* Ugly ! */);
                ret.typeArguments = args;
                return ret;
              },
          function(args) { 
                return args === null ? {
                  node:     'ThisExpression',
                  qualifier: null
                } : { 
                  node:         'ConstructorInvocation', 
                  arguments:     args, 
                  typeArguments: [] 
                }; 
              },
          function(suffix) { 
                return suffix.node === 'SuperConstructorInvocation' 
                  ? suffix
                  : mergeProps(suffix, { qualifier: null }); 
              },
          function(creator) { return creator; },
          function(type, dims) {
                return {
                  node: 'TypeLiteral',
                  type:  buildArrayTree(type, dims)
                };
              },
          function() {
                return {
                  node: 'TypeLiteral',
                  type:  makePrimitive('void')
                };
              },
          function(qual, dims) { 
                return {
                  node: 'TypeLiteral',
                  type:  buildArrayTree(buildTypeName(qual, null, []), dims)
                };
              },
          function(qual, expr) { return { node: 'ArrayAccess', array: qual, index: expr }; },
          function(qual, args) { 
                return mergeProps(popQualified(qual), { 
                  node:         'MethodInvocation', 
                  arguments:     args, 
                  typeArguments: [] 
                }); 
              },
          function(qual) { return { node: 'TypeLiteral', type: buildTypeName(qual, null, []) }; },
          function(qual, ret) { 
                if (ret.expression) return TODO(/* Ugly ! */);
                ret.expression = qual;
                return ret; 
              },
          function(qual) { return { node: 'ThisExpression', qualifier: qual }; },
          function(qual, args) {
                return { 
                  node:         'SuperConstructorInvocation', 
                  arguments:     args, 
                  expression:    qual,
                  typeArguments: []
                };  
              },
          function(qual, args, rest) { return mergeProps(rest, { expression: qual, typeArguments: optionalList(args) }); },
          function() { return []; },
          function(suffix) { return suffix; },
          function(id, args) { return { node: 'MethodInvocation', arguments: args, name: id, typeArguments: [] }; },
          function(op) { return op[0]; /* remove ending spaces */ },
          function(id) { return { node: 'FieldAccess', name: id }; },
          function(ret) { return ret; },
          function() { return TODO(/* Any sample ? */); },
          function(args, ret) { return mergeProps(ret, { typeArguments: optionalList(args) }); },
          function(expr) { return { node: 'ArrayAccess', index: expr }; },
          function(args) { 
                return { 
                  node:         'SuperConstructorInvocation', 
                  arguments:     args, 
                  expression:    null,
                  typeArguments: []
                }; 
              },
          function(gen, id, args) { 
                return args === null ? {
                  node: 'SuperFieldAccess',
                  name:  id  
                } : { 
                  node:         'SuperMethodInvocation', 
                  typeArguments: optionalList(gen),
                  name:          id, 
                  arguments:     args
                }; 
              },
          "byte",
          peg$literalExpectation("byte", false),
          "short",
          peg$literalExpectation("short", false),
          "char",
          peg$literalExpectation("char", false),
          "int",
          peg$literalExpectation("int", false),
          "long",
          peg$literalExpectation("long", false),
          "float",
          peg$literalExpectation("float", false),
          "double",
          peg$literalExpectation("double", false),
          "boolean",
          peg$literalExpectation("boolean", false),
          function(type) { return makePrimitive(type); },
          function(args) { return optionalList(args); },
          function(type, rest) { 
                return  { 
                  node:       'ArrayCreation', 
                  type:        buildArrayTree(type, rest.extraDims), 
                  initializer: rest.init,
                  dimensions:  rest.dimms
                }; 
              },
          function(args, type, rest) {
                return mergeProps(rest, {
                  node:          'ClassInstanceCreation',
                  type:           type,
                  typeArguments:  args,
                  expression:     null
                });
              },
          function(qual, args, rest) { return buildTypeName(qual, args, rest); },
          function(id, args, rest) { 
                return mergeProps(rest, {
                  node: 'ClassInstanceCreation',
                  type:  buildTypeName(id, args, [])
                });  
              },
          function(args, body) {
                return {
                  arguments:                 args,
                  anonymousClassDeclaration: body === null ? null : {
                    node:            'AnonymousClassDeclaration',
                    bodyDeclarations: body
                  }
                };
              },
          function(dims, init) { return { extraDims:dims, init:init, dimms: [] }; },
          function(dimexpr, dims) { return { extraDims:dimexpr.concat(dims), init:null, dimms: dimexpr }; },
          function(dim) { return { extraDims:[dim], init:null, dimms: [] }; },
          function(init) { return { node: 'ArrayInitializer', expressions: optionalList(init) }; },
          function(expr) { return { node: 'ParenthesizedExpression', expression: expr }; },
          function(first, rest) { return buildQualified(first, rest, 1); },
          function(exp) { return exp; },
          function(type, dims) { return buildArrayTree(type, dims); },
          function(bas, dims) { return buildArrayTree(bas, dims); },
          function(cls, dims) { return buildArrayTree(cls, dims); },
          function(refType) { return refType; },
          function() { return true; },
          function() { return false; },
          function(rest) {
                return {
                  node:      'WildcardType',
                  upperBound: extractOptional(rest, 0, true),
                  bound:      extractOptional(rest, 1)
                }; 
              },
          function(id, bounds) { 
                return {
                  node:      'TypeParameter',
                  name:       id,
                  typeBounds: extractOptionalList(bounds, 1)
                };
              },
          function() { return { node: 'WildcardType' }; },
          "public",
          peg$literalExpectation("public", false),
          "protected",
          peg$literalExpectation("protected", false),
          "private",
          peg$literalExpectation("private", false),
          "static",
          peg$literalExpectation("static", false),
          "abstract",
          peg$literalExpectation("abstract", false),
          "final",
          peg$literalExpectation("final", false),
          "native",
          peg$literalExpectation("native", false),
          "synchronized",
          peg$literalExpectation("synchronized", false),
          "transient",
          peg$literalExpectation("transient", false),
          "volatile",
          peg$literalExpectation("volatile", false),
          "strictfp",
          peg$literalExpectation("strictfp", false),
          function(keyword) { return makeModifier(keyword); },
          function(id, body) { 
                return {
                  node:            'AnnotationTypeDeclaration',
                  name:             id,
                  bodyDeclarations: body
                }; 
              },
          function(decl) { return skipNulls(decl); },
          function(modifiers, rest) { return mergeProps(rest, { modifiers: modifiers }); },
          function(type, rest) { return mergeProps(rest, { type: type }); },
          function(id, def) { 
                return { 
                  node:   'AnnotationTypeMemberDeclaration', 
                  name:    id, 
                  default: def 
                }; 
              },
          function(fragments) { return { node: 'FieldDeclaration', fragments: fragments }; },
          function(val) { return val; },
          function(id, pairs) { 
                return { 
                  node:    'NormalAnnotation', 
                  typeName: id, 
                  values:   optionalList(pairs)
                }; 
              },
          function(id, value) { 
                return { 
                  node:    'SingleMemberAnnotation', 
                  typeName: id, 
                  value:    value 
                }; 
              },
          function(id) { return { node: 'MarkerAnnotation', typeName: id }; },
          function(name, value) { 
                return {
                  node: 'MemberValuePair',
                  name:  name,
                  value: value
                };
              },
          function(values) { return { node: 'ArrayInitializer', expressions: optionalList(values)}; },
          /^[ \t]/,
          peg$classExpectation([" ", "\t"], false, false),
          /^[ \t\r\n\f]/,
          peg$classExpectation([" ", "\t", "\r", "\n", "\f"], false, false),
          function(commentStatements) { return leadingComments(commentStatements); },
          function(comment) { return comment; },
          function(commentStatement) { return commentStatement; },
          "/**",
          peg$literalExpectation("/**", false),
          "*/",
          peg$literalExpectation("*/", false),
          function(comment) { return { value: "/**" + comment.join("") + "*/" }; },
          "/*",
          peg$literalExpectation("/*", false),
          "*",
          peg$literalExpectation("*", false),
          "/",
          peg$literalExpectation("/", false),
          function(comment) { return { value: "/*" + comment.join("") + "*/" }; },
          function(letter) { return letter[1]; },
          "//",
          peg$literalExpectation("//", false),
          function(comment) { return { value: "//" + comment.join("") }; },
          function(first, rest) { return { identifier: first + rest, node: 'SimpleName' }; },
          /^[a-z]/,
          peg$classExpectation([["a", "z"]], false, false),
          /^[A-Z]/,
          peg$classExpectation([["A", "Z"]], false, false),
          /^[_$]/,
          peg$classExpectation(["_", "$"], false, false),
          /^[0-9]/,
          peg$classExpectation([["0", "9"]], false, false),
          "assert",
          peg$literalExpectation("assert", false),
          "break",
          peg$literalExpectation("break", false),
          "case",
          peg$literalExpectation("case", false),
          "catch",
          peg$literalExpectation("catch", false),
          "class",
          peg$literalExpectation("class", false),
          "const",
          peg$literalExpectation("const", false),
          "continue",
          peg$literalExpectation("continue", false),
          "default",
          peg$literalExpectation("default", false),
          "do",
          peg$literalExpectation("do", false),
          "else",
          peg$literalExpectation("else", false),
          "enum",
          peg$literalExpectation("enum", false),
          "extends",
          peg$literalExpectation("extends", false),
          "false",
          peg$literalExpectation("false", false),
          "finally",
          peg$literalExpectation("finally", false),
          "for",
          peg$literalExpectation("for", false),
          "goto",
          peg$literalExpectation("goto", false),
          "if",
          peg$literalExpectation("if", false),
          "implements",
          peg$literalExpectation("implements", false),
          "import",
          peg$literalExpectation("import", false),
          "interface",
          peg$literalExpectation("interface", false),
          "instanceof",
          peg$literalExpectation("instanceof", false),
          "new",
          peg$literalExpectation("new", false),
          "null",
          peg$literalExpectation("null", false),
          "package",
          peg$literalExpectation("package", false),
          "return",
          peg$literalExpectation("return", false),
          "super",
          peg$literalExpectation("super", false),
          "switch",
          peg$literalExpectation("switch", false),
          "this",
          peg$literalExpectation("this", false),
          "throws",
          peg$literalExpectation("throws", false),
          "throw",
          peg$literalExpectation("throw", false),
          "true",
          peg$literalExpectation("true", false),
          "try",
          peg$literalExpectation("try", false),
          "void",
          peg$literalExpectation("void", false),
          "while",
          peg$literalExpectation("while", false),
          function() { return { node: 'BooleanLiteral', booleanValue: true }; },
          function() { return { node: 'BooleanLiteral', booleanValue: false }; },
          function() { return { node: 'NullLiteral' }; },
          function(literal) { return literal; },
          /^[lL]/,
          peg$classExpectation(["l", "L"], false, false),
          function() { return { node: 'NumberLiteral', token: text() }; },
          "0",
          peg$literalExpectation("0", false),
          /^[1-9]/,
          peg$classExpectation([["1", "9"]], false, false),
          /^[_]/,
          peg$classExpectation(["_"], false, false),
          "0x",
          peg$literalExpectation("0x", false),
          "0X",
          peg$literalExpectation("0X", false),
          "0b",
          peg$literalExpectation("0b", false),
          "0B",
          peg$literalExpectation("0B", false),
          /^[01]/,
          peg$classExpectation(["0", "1"], false, false),
          /^[0-7]/,
          peg$classExpectation([["0", "7"]], false, false),
          ".",
          peg$literalExpectation(".", false),
          /^[fFdD]/,
          peg$classExpectation(["f", "F", "d", "D"], false, false),
          /^[eE]/,
          peg$classExpectation(["e", "E"], false, false),
          /^[+\-]/,
          peg$classExpectation(["+", "-"], false, false),
          /^[pP]/,
          peg$classExpectation(["p", "P"], false, false),
          /^[a-f]/,
          peg$classExpectation([["a", "f"]], false, false),
          /^[A-F]/,
          peg$classExpectation([["A", "F"]], false, false),
          "'",
          peg$literalExpectation("'", false),
          /^['\\\n\r]/,
          peg$classExpectation(["'", "\\", "\n", "\r"], false, false),
          function() { return { node: 'CharacterLiteral', escapedValue: text() }; },
          "\"",
          peg$literalExpectation("\"", false),
          /^["\\\n\r]/,
          peg$classExpectation(["\"", "\\", "\n", "\r"], false, false),
          function() { return { node: 'StringLiteral', escapedValue: text() }; },
          "\\",
          peg$literalExpectation("\\", false),
          /^[btnfr"'\\]/,
          peg$classExpectation(["b", "t", "n", "f", "r", "\"", "'", "\\"], false, false),
          /^[0-3]/,
          peg$classExpectation([["0", "3"]], false, false),
          "u",
          peg$literalExpectation("u", false),
          "@",
          peg$literalExpectation("@", false),
          "&",
          peg$literalExpectation("&", false),
          /^[=&]/,
          peg$classExpectation(["=", "&"], false, false),
          "&&",
          peg$literalExpectation("&&", false),
          "&=",
          peg$literalExpectation("&=", false),
          "!",
          peg$literalExpectation("!", false),
          "=",
          peg$literalExpectation("=", false),
          ">>>",
          peg$literalExpectation(">>>", false),
          ">>>=",
          peg$literalExpectation(">>>=", false),
          ":",
          peg$literalExpectation(":", false),
          "::",
          peg$literalExpectation("::", false),
          ",",
          peg$literalExpectation(",", false),
          "--",
          peg$literalExpectation("--", false),
          "/=",
          peg$literalExpectation("/=", false),
          "...",
          peg$literalExpectation("...", false),
          "==",
          peg$literalExpectation("==", false),
          ">=",
          peg$literalExpectation(">=", false),
          ">",
          peg$literalExpectation(">", false),
          /^[=>]/,
          peg$classExpectation(["=", ">"], false, false),
          "^",
          peg$literalExpectation("^", false),
          "^=",
          peg$literalExpectation("^=", false),
          "++",
          peg$literalExpectation("++", false),
          "[",
          peg$literalExpectation("[", false),
          "<=",
          peg$literalExpectation("<=", false),
          "(",
          peg$literalExpectation("(", false),
          "<",
          peg$literalExpectation("<", false),
          /^[=<]/,
          peg$classExpectation(["=", "<"], false, false),
          "{",
          peg$literalExpectation("{", false),
          "-",
          peg$literalExpectation("-", false),
          /^[=\-]/,
          peg$classExpectation(["=", "-"], false, false),
          "-=",
          peg$literalExpectation("-=", false),
          "%",
          peg$literalExpectation("%", false),
          "%=",
          peg$literalExpectation("%=", false),
          "!=",
          peg$literalExpectation("!=", false),
          "|",
          peg$literalExpectation("|", false),
          /^[=|]/,
          peg$classExpectation(["=", "|"], false, false),
          "|=",
          peg$literalExpectation("|=", false),
          "||",
          peg$literalExpectation("||", false),
          "+",
          peg$literalExpectation("+", false),
          /^[=+]/,
          peg$classExpectation(["=", "+"], false, false),
          "+=",
          peg$literalExpectation("+=", false),
          "->",
          peg$literalExpectation("->", false),
          "?",
          peg$literalExpectation("?", false),
          "]",
          peg$literalExpectation("]", false),
          ")",
          peg$literalExpectation(")", false),
          "}",
          peg$literalExpectation("}", false),
          ";",
          peg$literalExpectation(";", false),
          "<<",
          peg$literalExpectation("<<", false),
          "<<=",
          peg$literalExpectation("<<=", false),
          ">>",
          peg$literalExpectation(">>", false),
          ">>=",
          peg$literalExpectation(">>=", false),
          "*=",
          peg$literalExpectation("*=", false),
          "~",
          peg$literalExpectation("~", false),
          peg$anyExpectation()
        ],

        peg$bytecode = [
          peg$decode("%;\x99/j#;!.\" &\"/\\$$;\"0#*;\"&/L$$;#0#*;#&/<$;\x9B/3$;\u010F/*$8&: &#$#\")(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\x9B/^#;\x9C/U$$;\x8F0#*;\x8F&/E$;\xBB/<$;z/3$;\u0107/*$8&:!&#$#!)(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\x9B/t#;\xB7/k$;\xBD.\" &\"/]$;z/T$%;\xE8/,#;\u010C/#$+\")(\"'#&'#.\" &\"/3$;\u0107/*$8&:\"&##\"!)(&'#(%'#($'#(#'#(\"'#&'#.. &%;\u0107/& 8!:#! )"),
          peg$decode("%;\x9B/p#;\x9C/g$;\x9B/^$$;\x860#*;\x86&/N$;\x9B/E$;$./ &;8.) &;,.# &;\x87/*$8&:$&#$\" )(&'#(%'#($'#(#'#(\"'#&'#.. &%;\u0107/& 8!:#! )"),
          peg$decode("%;\xAB/\xB2#;\xA3/\xA9$;\x9B/\xA0$;\x83.\" &\"/\x92$;\x9B/\x89$%;\xB1/,#;\x7F/#$+\")(\"'#&'#.\" &\"/h$;\x9B/_$%;\xB6/,#;\x80/#$+\")(\"'#&'#.\" &\"/>$;\x9B/5$;%/,$8*:%*%(&$\" )(*'#()'#(('#(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\xF6/J#$;&0#*;&&/:$;\x98/1$;\u0106/($8$:&$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/0#;\u0107/'$8\":#\" )(\"'#&'#.\u010B &%;\x98/@#;\xBD.\" &\"/2$;E/)$8#:'#\"! )(#'#(\"'#&'#.\xDE &%;\x98/B#$;\x860#*;\x86&/2$;'/)$8#:(#\"! )(#'#(\"'#&'#.\xAF &%;\x98/1#;\xA1/($8\":)\"! )(\"'#&'#.\x91 &%;\x98/1#;\x9F/($8\":*\"! )(\"'#&'#.s &%;\x98/1#;\x9E/($8\":+\"! )(\"'#&'#.U &%;\x98/K#%<;\xA5=.##&&!&'#/6$4,\"\"5!7-/'$8#:.# )(#'#(\"'#&'#"),
          peg$decode("%;\x83/2#;(/)$8\":/\"\"! )(\"'#&'#.\xCD &%;}/<#;\xA3/3$;)/*$8#:0##\"! )(#'#(\"'#&'#.\xA4 &%;}/;#;>/2$;\u0107/)$8#:1#\"\"!)(#'#(\"'#&'#.| &%;\xC5/;#;\xA3/2$;*/)$8#:2#\"! )(#'#(\"'#&'#.T &%;\xA3/2#;+/)$8\":3\"\"! )(\"'#&'#.5 &;,./ &;$.) &;8.# &;\x87"),
          peg$decode("%;}.. &%;\xC5/& 8!:4! )/<#;\xA3/3$;)/*$8#:5##\"! )(#'#(\"'#&'#.< &%;\xA3/2#;+/)$8\":6\"\"! )(\"'#&'#"),
          peg$decode("%;@/y#$;{0#*;{&/i$%;\xC2/,#;\x80/#$+\")(\"'#&'#.\" &\"/H$;E.1 &%;\u0107/) 8!:7!#$#\")/+$8$:8$$#\"! )($'#(#'#(\"'#&'#"),
          peg$decode("%;@/g#%;\xC2/,#;\x80/#$+\")(\"'#&'#.\" &\"/F$;E.0 &%;\u0107/( 8!:9!\"#\")/*$8#::##\"! )(#'#(\"'#&'#"),
          peg$decode("%;@/T#%;\xC2/,#;\x80/#$+\")(\"'#&'#.\" &\"/3$;E/*$8#:;##\"! )(#'#(\"'#&'#"),
          peg$decode("%;\xB8/l#;\xA3/c$;\x83.\" &\"/U$%;\xB1/,#;\x80/#$+\")(\"'#&'#.\" &\"/4$;-/+$8%:<%$#\"! )(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\xF6/J#$;.0#*;.&/:$;\x98/1$;\u0106/($8$:&$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/B#$;\x860#*;\x86&/2$;//)$8#:(#\"! )(#'#(\"'#&'#.\xCC &%;\x98/0#;\u0107/'$8\":#\" )(\"'#&'#.\xAF &%;\x98/1#;\xA1/($8\":)\"! )(\"'#&'#.\x91 &%;\x98/1#;\x9F/($8\":*\"! )(\"'#&'#.s &%;\x98/1#;\x9E/($8\":+\"! )(\"'#&'#.U &%;\x98/K#%<;\xA5=.##&&!&'#/6$4,\"\"5!7-/'$8#:.# )(#'#(\"'#&'#"),
          peg$decode(";0.c &;3.] &%;\xC5/;#;\xA3/2$;4/)$8#:6#\"! )(#'#(\"'#&'#.5 &;,./ &;\x87.) &;$.# &;8"),
          peg$decode("%;}/<#;\xA3/3$;1/*$8#:=##\"! )(#'#(\"'#&'#"),
          peg$decode("%;5/1#;\u0107/($8\":>\"!!)(\"'#&'#.# &;2"),
          peg$decode("%;@/d#$;{0#*;{&/T$%;\xC2/,#;\x80/#$+\")(\"'#&'#.\" &\"/3$;\u0107/*$8$:?$##\"!)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x83/X#;}./ &%;\xC5/' 8!:@!!\")/=$;\xA3/4$;2/+$8$:A$$#\"! )($'#(#'#(\"'#&'#"),
          peg$decode("%;@/S#%;\xC2/,#;\x80/#$+\")(\"'#&'#.\" &\"/2$;\u0107/)$8#:B#\"\"!)(#'#(\"'#&'#"),
          peg$decode("%;7/_#$%;\xE4/,#;6/#$+\")(\"'#&'#06*%;\xE4/,#;6/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode("%;\xA3/2#;7/)$8\":6\"\"! )(\"'#&'#"),
          peg$decode("%$;{0#*;{&/;#;\xEA/2$;x/)$8#:D#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;\xB0/]#;\xA3/T$%;\xB6/,#;\x80/#$+\")(\"'#&'#.\" &\"/3$;9/*$8$:E$#\"! )($'#(#'#(\"'#&'#"),
          peg$decode("%;\xF6/\\#;:.\" &\"/N$;\xE4.\" &\"/@$;<.\" &\"/2$;\u0106/)$8%:F%\"#!)(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;;/_#$%;\xE4/,#;;/#$+\")(\"'#&'#06*%;\xE4/,#;;/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode("%;\x9B/`#$;\x8F0#*;\x8F&/P$;\xA3/G$;q.\" &\"/9$;%.\" &\"/+$8%:G%$#\"! )(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\u0107/8#$;&0#*;&&/($8\":H\"! )(\"'#&'#"),
          peg$decode("%;\x98/w#$%;\xB3/& 8!:I! ).# &;\x8F04*%;\xB3/& 8!:I! ).# &;\x8F&/E$;}/<$;>/3$;\u0107/*$8%:J%##\"!)(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;?/_#$%;\xE4/,#;?/#$+\")(\"'#&'#06*%;\xE4/,#;?/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode("%;\xA3/[#$;{0#*;{&/K$%;\xEA/,#;x/#$+\")(\"'#&'#.\" &\"/*$8#:K##\"! )(#'#(\"'#&'#"),
          peg$decode("%;\xF3/H#;C.\" &\"/:$;\x9B/1$;\u0104/($8$:L$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%$%;\xB3/& 8!:I! ).# &;\x8F04*%;\xB3/& 8!:I! ).# &;\x8F&/<#;}/3$;D/*$8#:M##\"! )(#'#(\"'#&'#"),
          peg$decode("%$%;\xB3/& 8!:I! ).# &;\x8F04*%;\xB3/& 8!:I! ).# &;\x8F&/E#;}/<$;\xE9/3$;D/*$8$:N$##\" )($'#(#'#(\"'#&'#"),
          peg$decode("%;A/\x81#$%;\xE4/,#;A/#$+\")(\"'#&'#06*%;\xE4/,#;A/#$+\")(\"'#&'#&/K$%;\xE4/,#;B/#$+\")(\"'#&'#.\" &\"/*$8#:O##\"! )(#'#(\"'#&'#./ &%;B/' 8!:P!! )"),
          peg$decode("%;\xA3/9#$;{0#*;{&/)$8\":Q\"\"! )(\"'#&'#"),
          peg$decode("%;\xF6/C#;F/:$;\x98/1$;\u0106/($8$:R$!\")($'#(#'#(\"'#&'#"),
          peg$decode("$;G0#*;G&"),
          peg$decode(";=.X &%;\x98/H#$;\x860#*;\x86&/8$;$.# &;8/)$8#:S#\"! )(#'#(\"'#&'#.# &;H"),
          peg$decode(";E.\u0566 &%;\x98/e#;\xA7/\\$;R/S$%;\xE2/,#;R/#$+\")(\"'#&'#.\" &\"/2$;\u0107/)$8%:T%\"\"!)(%'#($'#(#'#(\"'#&'#.\u0514 &%;\x98/f#;\xB5/]$;y/T$;H/K$%;\xAF/,#;H/#$+\")(\"'#&'#.\" &\"/*$8%:U%#\"! )(%'#($'#(#'#(\"'#&'#.\u04C1 &%;\x98/\x8B#;\xB4/\x82$;\xF3/y$;O.\" &\"/k$;\u0107/b$;R.\" &\"/T$;\u0107/K$;P.\" &\"/=$;\u0104/4$;H/+$8*:V*$&$\" )(*'#()'#(('#(''#(&'#(%'#($'#(#'#(\"'#&'#.\u0449 &%;\x98/i#;\xB4/`$;\xF3/W$;A/N$;\xE2/E$;R/<$;\u0104/3$;H/*$8(:W(#$\" )(('#(''#(&'#(%'#($'#(#'#(\"'#&'#.\u03F3 &%;\x98/D#;\xC6/;$;y/2$;H/)$8$:X$\"! )($'#(#'#(\"'#&'#.\u03C2 &%;\x98/V#;\xAE/M$;H/D$;\xC6/;$;y/2$;\u0107/)$8&:Y&\"#!)(&'#(%'#($'#(#'#(\"'#&'#.\u037F &%;\x98/\xBB#;\xC4/\xB2$;\xF3/\xA9$;I/\xA0$$%;\u0107/,#;I/#$+\")(\"'#&'#06*%;\u0107/,#;I/#$+\")(\"'#&'#&/j$;\u0107.\" &\"/\\$;\u0104/S$;E/J$$;J0#*;J&/:$;K.\" &\"/,$8*:Z*%&%\"! )(*'#()'#(('#(''#(&'#(%'#($'#(#'#(\"'#&'#.\u02D7 &%;\x98/\x83#;\xC4/z$;E/q$%$;J/&#0#*;J&&&#/8#;K.\" &\"/*$8\":[\"##! )(\"'#&'#.0 &%;K/( 8!:\\!\"\" )/)$8$:]$\"! )($'#(#'#(\"'#&'#.\u0267 &%;\x98/V#;\xBF/M$;y/D$;\xF6/;$;L/2$;\u0106/)$8&:^&\"#!)(&'#(%'#($'#(#'#(\"'#&'#.\u0224 &%;\x98/D#;\xC0/;$;y/2$;E/)$8$:_$\"! )($'#(#'#(\"'#&'#.\u01F3 &%;\x98/H#;\xBC/?$;R.\" &\"/1$;\u0107/($8$:`$!!)($'#(#'#(\"'#&'#.\u01BE &%;\x98/C#;\xC3/:$;R/1$;\u0107/($8$:a$!!)($'#(#'#(\"'#&'#.\u018E &%;\x98/H#;\xA8/?$;\xA3.\" &\"/1$;\u0107/($8$:b$!!)($'#(#'#(\"'#&'#.\u0159 &%;\x98/H#;\xAC/?$;\xA3.\" &\"/1$;\u0107/($8$:c$!!)($'#(#'#(\"'#&'#.\u0124 &%;\x98/0#;\u0107/'$8\":d\" )(\"'#&'#.\u0107 &%;\x98/:#;Q/1$;\u0107/($8#:e#!!)(#'#(\"'#&'#.\xE0 &%;\x98/D#;\xA3/;$;\xE2/2$;H/)$8$:f$\"\" )($'#(#'#(\"'#&'#.\xAF &%;\x98/1#;\xA1/($8\":)\"! )(\"'#&'#.\x91 &%;\x98/1#;\x9F/($8\":*\"! )(\"'#&'#.s &%;\x98/1#;\x9E/($8\":+\"! )(\"'#&'#.U &%;\x98/K#%<;\xA5=.##&&!&'#/6$4,\"\"5!7-/'$8#:.# )(#'#(\"'#&'#"),
          peg$decode("%$%;\xB3/& 8!:I! ).# &;\x8F04*%;\xB3/& 8!:I! ).# &;\x8F&/O#;}/F$;D/=$;\xEA/4$;R/+$8%:g%$$#\" )(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\xAA/\xCA#;\xF3/\xC1$$%;\xB3/& 8!:I! ).# &;\x8F04*%;\xB3/& 8!:I! ).# &;\x8F&/\x8F$;}/\x86$$%;\xFC/,#;}/#$+\")(\"'#&'#06*%;\xFC/,#;}/#$+\")(\"'#&'#&/P$;D/G$;\x9B/>$;\u0104/5$;E/,$8):h)%&%$# )()'#(('#(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\xB2/1#;E/($8\":i\"! )(\"'#&'#"),
          peg$decode("%$;M0#*;M&/' 8!:j!! )"),
          peg$decode("%;N/2#;F/)$8\":k\"\"! )(\"'#&'#"),
          peg$decode("%;\xA9/:#;R/1$;\xE2/($8#:l#!!)(#'#(\"'#&'#.a &%;\xA9/:#;\xA3/1$;\xE2/($8#:l#!!)(#'#(\"'#&'#.: &%;\xAD/0#;\xE2/'$8\":#\" )(\"'#&'#"),
          peg$decode("%$%;\xB3/& 8!:I! ).# &;\x8F04*%;\xB3/& 8!:I! ).# &;\x8F&/<#;}/3$;>/*$8#:m##\"! )(#'#(\"'#&'#.i &%;Q/_#$%;\xE4/,#;Q/#$+\")(\"'#&'#06*%;\xE4/,#;Q/#$+\")(\"'#&'#&/)$8\":n\"\"! )(\"'#&'#"),
          peg$decode("%;Q/_#$%;\xE4/,#;Q/#$+\")(\"'#&'#06*%;\xE4/,#;Q/#$+\")(\"'#&'#&/)$8\":n\"\"! )(\"'#&'#"),
          peg$decode("%;R/' 8!:o!! )"),
          peg$decode("%;V/<#;U/3$;R/*$8#:p##\"! )(#'#(\"'#&'#.c &%;\xA3/M#;\xE3/D$;\xA3./ &%;\xBA/' 8!:q!!#)/)$8#:r#\"\" )(#'#(\"'#&'#.) &;S.# &;V"),
          peg$decode("%;q/;#;\u0101/2$;T/)$8#:s#\"\" )(#'#(\"'#&'#.E &%;\xA3/;#;\u0101/2$;T/)$8#:t#\"\" )(#'#(\"'#&'#"),
          peg$decode("%;E/' 8!:u!! )./ &%;Q/' 8!:v!! )"),
          peg$decode(";\xEA._ &;\u0100.Y &;\xF8.S &;\u010D.M &;\xE7.G &;\xDE.A &;\xFD.; &;\xEF.5 &;\xFA./ &;\u0109.) &;\u010B.# &;\xE1"),
          peg$decode("%;W/N#;\u0102/E$;R/<$;\xE2/3$;V/*$8%:w%#$\" )(%'#($'#(#'#(\"'#&'#.# &;W"),
          peg$decode("%;X/_#$%;\xFE/,#;X/#$+\")(\"'#&'#06*%;\xFE/,#;X/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;Y/_#$%;\xDD/,#;Y/#$+\")(\"'#&'#06*%;\xDD/,#;Y/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;Z/_#$%;\xFC/,#;Z/#$+\")(\"'#&'#06*%;\xFC/,#;Z/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;[/_#$%;\xEE/,#;[/#$+\")(\"'#&'#06*%;\xEE/,#;[/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;\\/_#$%;\xDC/,#;\\/#$+\")(\"'#&'#06*%;\xDC/,#;\\/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;]/k#$%;\xEB.# &;\xFB/,#;]/#$+\")(\"'#&'#0<*%;\xEB.# &;\xFB/,#;]/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;^/\xB5#$%;\xF2./ &;\xEC.) &;\xF5.# &;\xED/,#;^/#$+\")(\"'#&'#.6 &%;\xB9/,#;~/#$+\")(\"'#&'#0a*%;\xF2./ &;\xEC.) &;\xF5.# &;\xED/,#;^/#$+\")(\"'#&'#.6 &%;\xB9/,#;~/#$+\")(\"'#&'#&/)$8\":y\"\"! )(\"'#&'#"),
          peg$decode("%;_/w#$%;\u0108.) &;\u010A.# &;\xE0/,#;_/#$+\")(\"'#&'#0B*%;\u0108.) &;\u010A.# &;\xE0/,#;_/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;`/k#$%;\xFF.# &;\xF7/,#;`/#$+\")(\"'#&'#0<*%;\xFF.# &;\xF7/,#;`/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;a/w#$%;\u010C.) &;\xE6.# &;\xF9/,#;a/#$+\")(\"'#&'#0B*%;\u010C.) &;\xE6.# &;\xF9/,#;a/#$+\")(\"'#&'#&/)$8\":x\"\"! )(\"'#&'#"),
          peg$decode("%;l/2#;a/)$8\":z\"\"! )(\"'#&'#.# &;b"),
          peg$decode("%;c/' 8!:{!! ).\xC6 &%;d/Z#;n/Q$$;n0#*;n&/A$$;m/&#0#*;m&&&#/+$8$:|$$#\"! )($'#(#'#(\"'#&'#.\x7F &%;d/C#;n/:$$;n0#*;n&/*$8#:}##\"! )(#'#(\"'#&'#.O &%;d/?#$;m/&#0#*;m&&&#/)$8\":~\"\"! )(\"'#&'#.# &;d"),
          peg$decode("%;\xF3/>#;p/5$;\u0104/,$;a/#$+$)($'#(#'#(\"'#&'#.H &%;\xF3/>#;~/5$;\u0104/,$;b/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode(";y.\u012A &%;g/Q#;k.< &%;\xC1/2#;q/)$8\":\x7F\"\"# )(\"'#&'#/)$8\":\x80\"\"! )(\"'#&'#.\xEC &%;\xC1/6#;q.\" &\"/($8\":\x81\"! )(\"'#&'#.\xC9 &%;\xBE/1#;o/($8\":\x82\"! )(\"'#&'#.\xAB &;\xC7.\xA5 &%;\xBA/1#;r/($8\":\x83\"! )(\"'#&'#.\x87 &;e.\x81 &;z.{ &%;p/K#$;{0#*;{&/;$;\xE8/2$;\xAB/)$8$:\x84$\"#\")($'#(#'#(\"'#&'#.C &%;\xC5/9#;\xE8/0$;\xAB/'$8#:\x85# )(#'#(\"'#&'#"),
          peg$decode("%;z/Q#$;{/&#0#*;{&&&#/;$;\xE8/2$;\xAB/)$8$:\x86$\"#\")($'#(#'#(\"'#&'#.\u0154 &%;z/D#;\xF1/;$;R/2$;\u0103/)$8$:\x87$\"#!)($'#(#'#(\"'#&'#.\u0123 &%;z/2#;q/)$8\":\x88\"\"! )(\"'#&'#.\u0104 &%;z/:#;\xE8/1$;\xAB/($8#:\x89#!\")(#'#(\"'#&'#.\xDD &%;z/;#;\xE8/2$;f/)$8#:\x8A#\"\" )(#'#(\"'#&'#.\xB5 &%;z/:#;\xE8/1$;\xC1/($8#:\x8B#!\")(#'#(\"'#&'#.\x8E &%;z/D#;\xE8/;$;\xBE/2$;q/)$8$:\x8C$\"# )($'#(#'#(\"'#&'#.] &%;z/S#;\xE8/J$;\xBA/A$;g.\" &\"/3$;t/*$8%:\x8D%#$! )(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;g/2#;k/)$8\":\x80\"\"! )(\"'#&'#"),
          peg$decode("%;\xF4/q#;~/h$$%;\xE4/,#;~/#$+\")(\"'#&'#06*%;\xE4/,#;~/#$+\")(\"'#&'#&/2$;\u0105/)$8$:C$\"\"!)($'#(#'#(\"'#&'#"),
          peg$decode("%;\xF4/0#;\u0105/'$8\":\x8E\" )(\"'#&'#"),
          peg$decode("%;\xF4/0#;\u0105/'$8\":\x8E\" )(\"'#&'#.# &;\x81"),
          peg$decode("%;\xF4/,#;\u0105/#$+\")(\"'#&'#.# &;g"),
          peg$decode("%;\xBE/1#;o/($8\":\x8F\"! )(\"'#&'#.< &%;\xA3/2#;q/)$8\":\x90\"\"! )(\"'#&'#"),
          peg$decode("%;\xF0.; &;\xE5.5 &;\xDF./ &;\u010E.) &;\xFF.# &;\xF7/' 8!:\x91!! )"),
          peg$decode("%;\xF0.# &;\xE5/' 8!:\x91!! )"),
          peg$decode("%;\xE8/;#;\xA3/2$;q/)$8#:\x90#\"! )(#'#(\"'#&'#.\xE5 &%;\xE8/1#;\xA3/($8\":\x92\"! )(\"'#&'#.\xC7 &%;\xE8/1#;f/($8\":\x93\"! )(\"'#&'#.\xA9 &%;\xE8/0#;\xC1/'$8\":\x94\" )(\"'#&'#.\x8C &%;\xE8/:#;\xBE/1$;o/($8#:\x8F#! )(#'#(\"'#&'#.e &%;\xE8/I#;\xBA/@$;g.\" &\"/2$;t/)$8$:\x95$\"! )($'#(#'#(\"'#&'#./ &%;|/' 8!:\x96!! )"),
          peg$decode("%;q/' 8!:\x97!! ).Y &%;\xE8/O#;g.\" &\"/A$;\xA3/8$;q.\" &\"/*$8$:\x98$#\"! )($'#(#'#(\"'#&'#"),
          peg$decode("%2\x99\"\"6\x997\x9A.q &2\x9B\"\"6\x9B7\x9C.e &2\x9D\"\"6\x9D7\x9E.Y &2\x9F\"\"6\x9F7\xA0.M &2\xA1\"\"6\xA17\xA2.A &2\xA3\"\"6\xA37\xA4.5 &2\xA5\"\"6\xA57\xA6.) &2\xA7\"\"6\xA77\xA8/F#%<;\xA5=.##&&!&'#/1$;\x99/($8#:\xA9#!\")(#'#(\"'#&'#"),
          peg$decode("%;\xF3/\x8E#%;R/_#$%;\xE4/,#;R/#$+\")(\"'#&'#06*%;\xE4/,#;R/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#.\" &\"/:$;\x9B/1$;\u0104/($8$:\xAA$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;p.# &;s/2#;v/)$8\":\xAB\"\"! )(\"'#&'#.Q &%;g.# &;h.\" &\"/<#;s/3$;u/*$8#:\xAC##\"! )(#'#(\"'#&'#"),
          peg$decode("%;z/\x8A#;i.\" &\"/|$$%;\xE8/:#;\xA3/1$;i.\" &\"/#$+#)(#'#(\"'#&'#0D*%;\xE8/:#;\xA3/1$;i.\" &\"/#$+#)(#'#(\"'#&'#&/*$8#:\xAD##\"! )(#'#(\"'#&'#"),
          peg$decode("%;\xA3/A#;j.\" &\"/3$;u/*$8#:\xAE##\"! )(#'#(\"'#&'#"),
          peg$decode("%;q/7#;%.\" &\"/)$8\":\xAF\"\"! )(\"'#&'#"),
          peg$decode("%$;{/&#0#*;{&&&#/2#;w/)$8\":\xB0\"\"! )(\"'#&'#.b &%$;|/&#0#*;|&&&#/9#$;{0#*;{&/)$8\":\xB1\"\"! )(\"'#&'#./ &%;{/' 8!:\xB2!! )"),
          peg$decode("%;\xF6/\x9C#%;x/_#$%;\xE4/,#;x/#$+\")(\"'#&'#06*%;\xE4/,#;x/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#.\" &\"/H$;\xE4.\" &\"/:$;\x9B/1$;\u0106/($8%:\xB3%!#)(%'#($'#(#'#(\"'#&'#"),
          peg$decode(";w.# &;R"),
          peg$decode("%;\xF3/:#;R/1$;\u0104/($8#:\xB4#!!)(#'#(\"'#&'#"),
          peg$decode("%;\xA3/_#$%;\xE8/,#;\xA3/#$+\")(\"'#&'#06*%;\xE8/,#;\xA3/#$+\")(\"'#&'#&/)$8\":\xB5\"\"! )(\"'#&'#"),
          peg$decode("%;\xF1/,#;\u0103/#$+\")(\"'#&'#"),
          peg$decode("%;\xF1/:#;R/1$;\u0103/($8#:\xB6#!!)(#'#(\"'#&'#"),
          peg$decode("%;p.# &;\x7F/9#$;{0#*;{&/)$8\":\xB7\"\"! )(\"'#&'#"),
          peg$decode("%;p/?#$;{/&#0#*;{&&&#/)$8\":\xB8\"\"! )(\"'#&'#.C &%;\x7F/9#$;{0#*;{&/)$8\":\xB9\"\"! )(\"'#&'#"),
          peg$decode("%;\x9B/\x93#;z/\x8A$;\x81.\" &\"/|$$%;\xE8/:#;\xA3/1$;\x81.\" &\"/#$+#)(#'#(\"'#&'#0D*%;\xE8/:#;\xA3/1$;\x81.\" &\"/#$+#)(#'#(\"'#&'#&/*$8$:\xAD$#\"! )($'#(#'#(\"'#&'#"),
          peg$decode("%;\x7F/_#$%;\xE4/,#;\x7F/#$+\")(\"'#&'#06*%;\xE4/,#;\x7F/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode("%;\xF4/z#;\x82/q$$%;\xE4/,#;\x82/#$+\")(\"'#&'#06*%;\xE4/,#;\x82/#$+\")(\"'#&'#&/;$;\x9B/2$;\u0105/)$8%:C%\"#\")(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\x9B/1#;~/($8\":\xBA\"! )(\"'#&'#.x &%;\x9B/n#;\u0102/e$%%;\xB1/& 8!:\xBB! ).. &%;\xBE/& 8!:\xBC! )/,#;~/#$+\")(\"'#&'#.\" &\"/($8#:\xBD#! )(#'#(\"'#&'#"),
          peg$decode("%;\xF4/z#;\x84/q$$%;\xE4/,#;\x84/#$+\")(\"'#&'#06*%;\xE4/,#;\x84/#$+\")(\"'#&'#&/;$;\x9B/2$;\u0105/)$8%:C%\"#\")(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\x9B/S#;\xA3/J$%;\xB1/,#;\x85/#$+\")(\"'#&'#.\" &\"/)$8#:\xBE#\"! )(#'#(\"'#&'#.: &%;\x9B/0#;\u0102/'$8\":\xBF\" )(\"'#&'#"),
          peg$decode("%;\x7F/_#$%;\xDC/,#;\x7F/#$+\")(\"'#&'#06*%;\xDC/,#;\x7F/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode(";\x8F.\xD7 &%;\x98/\xCD#2\xC0\"\"6\xC07\xC1.\x95 &2\xC2\"\"6\xC27\xC3.\x89 &2\xC4\"\"6\xC47\xC5.} &2\xC6\"\"6\xC67\xC7.q &2\xC8\"\"6\xC87\xC9.e &2\xCA\"\"6\xCA7\xCB.Y &2\xCC\"\"6\xCC7\xCD.M &2\xCE\"\"6\xCE7\xCF.A &2\xD0\"\"6\xD07\xD1.5 &2\xD2\"\"6\xD27\xD3.) &2\xD4\"\"6\xD47\xD5/F$%<;\xA5=.##&&!&'#/1$;\x99/($8$:\xD6$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;\xDB/D#;\xB8/;$;\xA3/2$;\x88/)$8$:\xD7$\"! )($'#(#'#(\"'#&'#"),
          peg$decode("%;\xF6/A#$;\x890#*;\x89&/1$;\u0106/($8#:\xD8#!!)(#'#(\"'#&'#"),
          peg$decode("%$;\x860#*;\x86&/2#;\x8A/)$8\":\xD9\"\"! )(\"'#&'#.. &%;\u0107/& 8!:#! )"),
          peg$decode("%;}/;#;\x8B/2$;\u0107/)$8#:\xDA#\"\"!)(#'#(\"'#&'#.5 &;$./ &;8.) &;,.# &;\x87"),
          peg$decode(";\x8C.# &;\x8D"),
          peg$decode("%;\xA3/I#;\xF3/@$;\u0104/7$;\x8E.\" &\"/)$8$:\xDB$\"# )($'#(#'#(\"'#&'#"),
          peg$decode("%;>/' 8!:\xDC!! )"),
          peg$decode("%;\xAD/1#;\x95/($8\":\xDD\"! )(\"'#&'#"),
          peg$decode(";\x90.) &;\x91.# &;\x92"),
          peg$decode("%;\x98/m#;\xDB/d$;z/[$;\xF3/R$;\x93.\" &\"/D$;\x98/;$;\u0104/2$;\x99/)$8(:\xDE(\"%#)(('#(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/_#;\xDB/V$;z/M$;\xF3/D$;\x95/;$;\u0104/2$;\x99/)$8':\xDF'\"$\")(''#(&'#(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/C#;\xDB/:$;z/1$;\x99/($8$:\xE0$!!)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x94/_#$%;\xE4/,#;\x94/#$+\")(\"'#&'#06*%;\xE4/,#;\x94/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode("%;\x98/D#;\xA3/;$;\xEA/2$;\x95/)$8$:\xE1$\"\" )($'#(#'#(\"'#&'#"),
          peg$decode(";V.) &;\x8F.# &;\x96"),
          peg$decode("%;\xF6/M#;\x97.\" &\"/?$;\xE4.\" &\"/1$;\u0106/($8$:\xE2$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%;\x95/_#$%;\xE4/,#;\x95/#$+\")(\"'#&'#06*%;\xE4/,#;\x95/#$+\")(\"'#&'#&/)$8\":C\"\"! )(\"'#&'#"),
          peg$decode("$4\xE3\"\"5!7\xE40)*4\xE3\"\"5!7\xE4&"),
          peg$decode("%;\x98/1#;\x9A.\" &\"/#$+\")(\"'#&'#"),
          peg$decode("4,\"\"5!7-"),
          peg$decode("$4\xE5\"\"5!7\xE60)*4\xE5\"\"5!7\xE6&"),
          peg$decode("%$;\x9D0#*;\x9D&/' 8!:\xE7!! )"),
          peg$decode("%%;\x9E/D#$4,\"\"5!7-0)*4,\"\"5!7-&/($8\":\xE8\"!!)(\"'#&'#.\x7F &%;\x9F/D#$4,\"\"5!7-0)*4,\"\"5!7-&/($8\":\xE8\"!!)(\"'#&'#.N &%;\xA1/D#$4,\"\"5!7-0)*4,\"\"5!7-&/($8\":\xE8\"!!)(\"'#&'#/' 8!:\xE9!! )"),
          peg$decode("%2\xEA\"\"6\xEA7\xEB/[#$;\xA00#*;\xA0&/K$2\xEC\"\"6\xEC7\xED/<$4,\"\"5!7-.\" &\"/($8$:\xEE$!\")($'#(#'#(\"'#&'#"),
          peg$decode("%2\xEF\"\"6\xEF7\xF0/\x9B#%<%2\xF1\"\"6\xF17\xF2/>#%<2\xF3\"\"6\xF37\xF4=.##&&!&'#/#$+\")(\"'#&'#=.##&&!&'#/[$$;\xA00#*;\xA0&/K$2\xEC\"\"6\xEC7\xED/<$4,\"\"5!7-.\" &\"/($8%:\xF5%!\")(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%%%<2\xEC\"\"6\xEC7\xED=.##&&!&'#/,#;\u0110/#$+\")(\"'#&'#/' 8!:\xF6!! )"),
          peg$decode("%2\xF7\"\"6\xF77\xF8/G#$;\xA20#*;\xA2&/7$4,\"\"5!7-/($8#:\xF9#!!)(#'#(\"'#&'#"),
          peg$decode("%%%<4,\"\"5!7-=.##&&!&'#/,#;\u0110/#$+\")(\"'#&'#/' 8!:\xF6!! )"),
          peg$decode("%%<;\xA6=.##&&!&'#/R#;\xA4/I$%$;\xA50#*;\xA5&/\"!&,)/2$;\x99/)$8$:\xFA$\"\"!)($'#(#'#(\"'#&'#"),
          peg$decode("4\xFB\"\"5!7\xFC.5 &4\xFD\"\"5!7\xFE.) &4\xFF\"\"5!7\u0100"),
          peg$decode("4\xFB\"\"5!7\xFC.A &4\xFD\"\"5!7\xFE.5 &4\u0101\"\"5!7\u0102.) &4\xFF\"\"5!7\u0100"),
          peg$decode("%2\xC8\"\"6\xC87\xC9.\u028D &2\u0103\"\"6\u01037\u0104.\u0281 &2\xA7\"\"6\xA77\xA8.\u0275 &2\u0105\"\"6\u01057\u0106.\u0269 &2\x99\"\"6\x997\x9A.\u025D &2\u0107\"\"6\u01077\u0108.\u0251 &2\u0109\"\"6\u01097\u010A.\u0245 &2\x9D\"\"6\x9D7\x9E.\u0239 &2\u010B\"\"6\u010B7\u010C.\u022D &2\u010D\"\"6\u010D7\u010E.\u0221 &2\u010F\"\"6\u010F7\u0110.\u0215 &2\u0111\"\"6\u01117\u0112.\u0209 &2\xA5\"\"6\xA57\xA6.\u01FD &2\u0113\"\"6\u01137\u0114.\u01F1 &2\u0115\"\"6\u01157\u0116.\u01E5 &2\u0117\"\"6\u01177\u0118.\u01D9 &2\u0119\"\"6\u01197\u011A.\u01CD &2\u011B\"\"6\u011B7\u011C.\u01C1 &2\u011D\"\"6\u011D7\u011E.\u01B5 &2\xCA\"\"6\xCA7\xCB.\u01A9 &2\xA3\"\"6\xA37\xA4.\u019D &2\u011F\"\"6\u011F7\u0120.\u0191 &2\u0121\"\"6\u01217\u0122.\u0185 &2\u0123\"\"6\u01237\u0124.\u0179 &2\u0125\"\"6\u01257\u0126.\u016D &2\u0127\"\"6\u01277\u0128.\u0161 &2\u0129\"\"6\u01297\u012A.\u0155 &2\x9F\"\"6\x9F7\xA0.\u0149 &2\u012B\"\"6\u012B7\u012C.\u013D &2\xA1\"\"6\xA17\xA2.\u0131 &2\xCC\"\"6\xCC7\xCD.\u0125 &2\u012D\"\"6\u012D7\u012E.\u0119 &2\u012F\"\"6\u012F7\u0130.\u010D &2\u0131\"\"6\u01317\u0132.\u0101 &2\xC4\"\"6\xC47\xC5.\xF5 &2\xC2\"\"6\xC27\xC3.\xE9 &2\xC0\"\"6\xC07\xC1.\xDD &2\u0133\"\"6\u01337\u0134.\xD1 &2\x9B\"\"6\x9B7\x9C.\xC5 &2\xC6\"\"6\xC67\xC7.\xB9 &2\xD4\"\"6\xD47\xD5.\xAD &2\u0135\"\"6\u01357\u0136.\xA1 &2\u0137\"\"6\u01377\u0138.\x95 &2\xCE\"\"6\xCE7\xCF.\x89 &2\u0139\"\"6\u01397\u013A.} &2\u013B\"\"6\u013B7\u013C.q &2\u013D\"\"6\u013D7\u013E.e &2\xD0\"\"6\xD07\xD1.Y &2\u013F\"\"6\u013F7\u0140.M &2\u0141\"\"6\u01417\u0142.A &2\u0143\"\"6\u01437\u0144.5 &2\xD2\"\"6\xD27\xD3.) &2\u0145\"\"6\u01457\u0146/8#%<;\xA5=.##&&!&'#/#$+\")(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0103\"\"6\u01037\u0104/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0105\"\"6\u01057\u0106/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0107\"\"6\u01077\u0108/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0109\"\"6\u01097\u010A/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u010B\"\"6\u010B7\u010C/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u010F\"\"6\u010F7\u0110/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0111\"\"6\u01117\u0112/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0113\"\"6\u01137\u0114/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0115\"\"6\u01157\u0116/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0117\"\"6\u01177\u0118/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0119\"\"6\u01197\u011A/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u011D\"\"6\u011D7\u011E/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\xCA\"\"6\xCA7\xCB/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u011F\"\"6\u011F7\u0120/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0123\"\"6\u01237\u0124/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0125\"\"6\u01257\u0126/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0127\"\"6\u01277\u0128/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0129\"\"6\u01297\u012A/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u012B\"\"6\u012B7\u012C/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u012D\"\"6\u012D7\u012E/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0131\"\"6\u01317\u0132/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0133\"\"6\u01337\u0134/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\xC6\"\"6\xC67\xC7/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0135\"\"6\u01357\u0136/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0137\"\"6\u01377\u0138/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\xCE\"\"6\xCE7\xCF/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0139\"\"6\u01397\u013A/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u013B\"\"6\u013B7\u013C/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u013D\"\"6\u013D7\u013E/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0141\"\"6\u01417\u0142/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0143\"\"6\u01437\u0144/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x98/P#2\u0145\"\"6\u01457\u0146/A$%<;\xA5=.##&&!&'#/,$;\x99/#$+$)($'#(#'#(\"'#&'#"),
          peg$decode("%;\x9B/\xD9#;\xCD.\xBC &;\xC8.\xB6 &;\xD6.\xB0 &;\xD7.\xAA &%2\u013F\"\"6\u013F7\u0140/<#%<;\xA5=.##&&!&'#/'$8\":\u0147\" )(\"'#&'#.{ &%2\u011B\"\"6\u011B7\u011C/<#%<;\xA5=.##&&!&'#/'$8\":\u0148\" )(\"'#&'#.L &%2\u012F\"\"6\u012F7\u0130/<#%<;\xA5=.##&&!&'#/'$8\":\u0149\" )(\"'#&'#/1$;\x99/($8#:\u014A#!!)(#'#(\"'#&'#"),
          peg$decode("%;\xCA./ &;\xCB.) &;\xCC.# &;\xC9/;#4\u014B\"\"5!7\u014C.\" &\"/'$8\":\u014D\" )(\"'#&'#"),
          peg$decode("2\u014E\"\"6\u014E7\u014F.\x9B &%4\u0150\"\"5!7\u0151/\x8B#$%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u0101\"\"5!7\u0102/#$+\")(\"'#&'#0O*%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u0101\"\"5!7\u0102/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("%2\u0154\"\"6\u01547\u0155.) &2\u0156\"\"6\u01567\u0157/,#;\xD4/#$+\")(\"'#&'#"),
          peg$decode("%2\u0158\"\"6\u01587\u0159.) &2\u015A\"\"6\u015A7\u015B/\x9A#4\u015C\"\"5!7\u015D/\x8B$$%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u015C\"\"5!7\u015D/#$+\")(\"'#&'#0O*%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u015C\"\"5!7\u015D/#$+\")(\"'#&'#&/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u014E\"\"6\u014E7\u014F/\x91#$%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u015E\"\"5!7\u015F/#$+\")(\"'#&'#/R#0O*%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u015E\"\"5!7\u015F/#$+\")(\"'#&'#&&&#/#$+\")(\"'#&'#"),
          peg$decode("%;\xD0.# &;\xCE/& 8!:\u014D! )"),
          peg$decode("%;\xD3/b#2\u0160\"\"6\u01607\u0161/S$;\xD3.\" &\"/E$;\xCF.\" &\"/7$4\u0162\"\"5!7\u0163.\" &\"/#$+%)(%'#($'#(#'#(\"'#&'#.\xB8 &%2\u0160\"\"6\u01607\u0161/N#;\xD3/E$;\xCF.\" &\"/7$4\u0162\"\"5!7\u0163.\" &\"/#$+$)($'#(#'#(\"'#&'#.w &%;\xD3/@#;\xCF/7$4\u0162\"\"5!7\u0163.\" &\"/#$+#)(#'#(\"'#&'#.J &%;\xD3/@#;\xCF.\" &\"/2$4\u0162\"\"5!7\u0163/#$+#)(#'#(\"'#&'#"),
          peg$decode("%4\u0164\"\"5!7\u0165/@#4\u0166\"\"5!7\u0167.\" &\"/,$;\xD3/#$+#)(#'#(\"'#&'#"),
          peg$decode("%;\xD1/@#;\xD2/7$4\u0162\"\"5!7\u0163.\" &\"/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u0154\"\"6\u01547\u0155.) &2\u0156\"\"6\u01567\u0157/I#;\xD4.\" &\"/;$2\u0160\"\"6\u01607\u0161/,$;\xD4/#$+$)($'#(#'#(\"'#&'#.A &%;\xCA/7#2\u0160\"\"6\u01607\u0161.\" &\"/#$+\")(\"'#&'#"),
          peg$decode("%4\u0168\"\"5!7\u0169/@#4\u0166\"\"5!7\u0167.\" &\"/,$;\xD3/#$+#)(#'#(\"'#&'#"),
          peg$decode("%4\u0101\"\"5!7\u0102/\x8B#$%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u0101\"\"5!7\u0102/#$+\")(\"'#&'#0O*%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/2#4\u0101\"\"5!7\u0102/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("%;\xD5/\x7F#$%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/,#;\xD5/#$+\")(\"'#&'#0I*%$4\u0152\"\"5!7\u01530)*4\u0152\"\"5!7\u0153&/,#;\xD5/#$+\")(\"'#&'#&/#$+\")(\"'#&'#"),
          peg$decode("4\u016A\"\"5!7\u016B.5 &4\u016C\"\"5!7\u016D.) &4\u0101\"\"5!7\u0102"),
          peg$decode("%2\u016E\"\"6\u016E7\u016F/j#;\xD8.H &%%<4\u0170\"\"5!7\u0171=.##&&!&'#/,#;\u0110/#$+\")(\"'#&'#/6$2\u016E\"\"6\u016E7\u016F/'$8#:\u0172# )(#'#(\"'#&'#"),
          peg$decode("%2\u0173\"\"6\u01737\u0174/\x9C#$;\xD8.H &%%<4\u0175\"\"5!7\u0176=.##&&!&'#/,#;\u0110/#$+\")(\"'#&'#0N*;\xD8.H &%%<4\u0175\"\"5!7\u0176=.##&&!&'#/,#;\u0110/#$+\")(\"'#&'#&/6$2\u0173\"\"6\u01737\u0174/'$8#:\u0177# )(#'#(\"'#&'#"),
          peg$decode("%2\u0178\"\"6\u01787\u0179/>#4\u017A\"\"5!7\u017B.) &;\xD9.# &;\xDA/#$+\")(\"'#&'#"),
          peg$decode("%4\u017C\"\"5!7\u017D/A#4\u015E\"\"5!7\u015F/2$4\u015E\"\"5!7\u015F/#$+#)(#'#(\"'#&'#.N &%4\u015E\"\"5!7\u015F/2#4\u015E\"\"5!7\u015F/#$+\")(\"'#&'#.) &4\u015E\"\"5!7\u015F"),
          peg$decode("%$2\u017E\"\"6\u017E7\u017F/,#0)*2\u017E\"\"6\u017E7\u017F&&&#/G#;\xD5/>$;\xD5/5$;\xD5/,$;\xD5/#$+%)(%'#($'#(#'#(\"'#&'#"),
          peg$decode("%2\u0180\"\"6\u01807\u0181/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u0182\"\"6\u01827\u0183/G#%<4\u0184\"\"5!7\u0185=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u0186\"\"6\u01867\u0187/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u0188\"\"6\u01887\u0189/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u018A\"\"6\u018A7\u018B/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u018E\"\"6\u018E7\u018F/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u0190\"\"6\u01907\u0191/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u0192\"\"6\u01927\u0193/G#%<2\u0192\"\"6\u01927\u0193=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u0194\"\"6\u01947\u0195/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u0196\"\"6\u01967\u0197/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u0198\"\"6\u01987\u0199/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\xF3\"\"6\xF37\xF4/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u019A\"\"6\u019A7\u019B/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%;\x9B/;#2\u0160\"\"6\u01607\u0161/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u019C\"\"6\u019C7\u019D/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u018C\"\"6\u018C7\u018D/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u019E\"\"6\u019E7\u019F/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01A0\"\"6\u01A07\u01A1/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01A2\"\"6\u01A27\u01A3/G#%<4\u01A4\"\"5!7\u01A5=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01A6\"\"6\u01A67\u01A7/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01A8\"\"6\u01A87\u01A9/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01AA\"\"6\u01AA7\u01AB/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01AC\"\"6\u01AC7\u01AD/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01AE\"\"6\u01AE7\u01AF/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01B0\"\"6\u01B07\u01B1/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01B2\"\"6\u01B27\u01B3/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01B2\"\"6\u01B27\u01B3/G#%<4\u01B4\"\"5!7\u01B5=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01B6\"\"6\u01B67\u01B7/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01B8\"\"6\u01B87\u01B9/G#%<4\u01BA\"\"5!7\u01BB=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01BC\"\"6\u01BC7\u01BD/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01BE\"\"6\u01BE7\u01BF/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01C0\"\"6\u01C07\u01C1/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01C2\"\"6\u01C27\u01C3/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01C4\"\"6\u01C47\u01C5/G#%<4\u01C6\"\"5!7\u01C7=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01C8\"\"6\u01C87\u01C9/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01CA\"\"6\u01CA7\u01CB/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01CC\"\"6\u01CC7\u01CD/G#%<4\u01CE\"\"5!7\u01CF=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01D0\"\"6\u01D07\u01D1/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01D2\"\"6\u01D27\u01D3/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01D4\"\"6\u01D47\u01D5/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01D6\"\"6\u01D67\u01D7/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01D8\"\"6\u01D87\u01D9/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01A2\"\"6\u01A27\u01A3/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01DA\"\"6\u01DA7\u01DB/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01DC\"\"6\u01DC7\u01DD/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01DE\"\"6\u01DE7\u01DF/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01E0\"\"6\u01E07\u01E1/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01E2\"\"6\u01E27\u01E3/G#%<4\u01A4\"\"5!7\u01A5=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01E4\"\"6\u01E47\u01E5/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\xF1\"\"6\xF17\xF2/G#%<2\u018C\"\"6\u018C7\u018D=.##&&!&'#/,$;\x99/#$+#)(#'#(\"'#&'#"),
          peg$decode("%2\u01E6\"\"6\u01E67\u01E7/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%2\u01E8\"\"6\u01E87\u01E9/,#;\x99/#$+\")(\"'#&'#"),
          peg$decode("%<;\u0110=.##&&!&'#"),
          peg$decode("1\"\"5!7\u01EA")
        ],

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1 }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleIndices)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleIndex = peg$startRuleIndices[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description, location) {
      location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

      throw peg$buildStructuredError(
        [peg$otherExpectation(description)],
        input.substring(peg$savedPos, peg$currPos),
        location
      );
    }

    function error(message, location) {
      location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

      throw peg$buildSimpleError(message, location);
    }

    function peg$literalExpectation(text, ignoreCase) {
      return { type: "literal", text: text, ignoreCase: ignoreCase };
    }

    function peg$classExpectation(parts, inverted, ignoreCase) {
      return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
    }

    function peg$anyExpectation() {
      return { type: "any" };
    }

    function peg$endExpectation() {
      return { type: "end" };
    }

    function peg$otherExpectation(description) {
      return { type: "other", description: description };
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos], p;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column
        };

        while (p < pos) {
          if (input.charCodeAt(p) === 10) {
            details.line++;
            details.column = 1;
          } else {
            details.column++;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildSimpleError(message, location) {
      return new peg$SyntaxError(message, null, null, location);
    }

    function peg$buildStructuredError(expected, found, location) {
      return new peg$SyntaxError(
        peg$SyntaxError.buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$decode(s) {
      var bc = new Array(s.length), i;

      for (i = 0; i < s.length; i++) {
        bc[i] = s.charCodeAt(i) - 32;
      }

      return bc;
    }

    function peg$parseRule(index) {
      var bc    = peg$bytecode[index],
          ip    = 0,
          ips   = [],
          end   = bc.length,
          ends  = [],
          stack = [],
          params, i;

      while (true) {
        while (ip < end) {
          switch (bc[ip]) {
            case 0:
              stack.push(peg$consts[bc[ip + 1]]);
              ip += 2;
              break;

            case 1:
              stack.push(void 0);
              ip++;
              break;

            case 2:
              stack.push(null);
              ip++;
              break;

            case 3:
              stack.push(peg$FAILED);
              ip++;
              break;

            case 4:
              stack.push([]);
              ip++;
              break;

            case 5:
              stack.push(peg$currPos);
              ip++;
              break;

            case 6:
              stack.pop();
              ip++;
              break;

            case 7:
              peg$currPos = stack.pop();
              ip++;
              break;

            case 8:
              stack.length -= bc[ip + 1];
              ip += 2;
              break;

            case 9:
              stack.splice(-2, 1);
              ip++;
              break;

            case 10:
              stack[stack.length - 2].push(stack.pop());
              ip++;
              break;

            case 11:
              stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip + 1]));
              ip += 2;
              break;

            case 12:
              stack.push(input.substring(stack.pop(), peg$currPos));
              ip++;
              break;

            case 13:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1]) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 14:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] === peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 15:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] !== peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 16:
              if (stack[stack.length - 1] !== peg$FAILED) {
                ends.push(end);
                ips.push(ip);

                end = ip + 2 + bc[ip + 1];
                ip += 2;
              } else {
                ip += 2 + bc[ip + 1];
              }

              break;

            case 17:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (input.length > peg$currPos) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 18:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length) === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 19:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length).toLowerCase() === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 20:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (peg$consts[bc[ip + 1]].test(input.charAt(peg$currPos))) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 21:
              stack.push(input.substr(peg$currPos, bc[ip + 1]));
              peg$currPos += bc[ip + 1];
              ip += 2;
              break;

            case 22:
              stack.push(peg$consts[bc[ip + 1]]);
              peg$currPos += peg$consts[bc[ip + 1]].length;
              ip += 2;
              break;

            case 23:
              stack.push(peg$FAILED);
              if (peg$silentFails === 0) {
                peg$fail(peg$consts[bc[ip + 1]]);
              }
              ip += 2;
              break;

            case 24:
              peg$savedPos = stack[stack.length - 1 - bc[ip + 1]];
              ip += 2;
              break;

            case 25:
              peg$savedPos = peg$currPos;
              ip++;
              break;

            case 26:
              params = bc.slice(ip + 4, ip + 4 + bc[ip + 3]);
              for (i = 0; i < bc[ip + 3]; i++) {
                params[i] = stack[stack.length - 1 - params[i]];
              }

              stack.splice(
                stack.length - bc[ip + 2],
                bc[ip + 2],
                peg$consts[bc[ip + 1]].apply(null, params)
              );

              ip += 4 + bc[ip + 3];
              break;

            case 27:
              stack.push(peg$parseRule(bc[ip + 1]));
              ip += 2;
              break;

            case 28:
              peg$silentFails++;
              ip++;
              break;

            case 29:
              peg$silentFails--;
              ip++;
              break;

            default:
              throw new Error("Invalid opcode: " + bc[ip] + ".");
          }
        }

        if (ends.length > 0) {
          end = ends.pop();
          ip = ips.pop();
        } else {
          break;
        }
      }

      return stack[0];
    }


      function extractOptional(optional, index, def) {
        def = typeof def !== 'undefined' ?  def : null;
        return optional ? optional[index] : def;
      }

      function extractList(list, index) {
        var result = new Array(list.length), i;

        for (i = 0; i < list.length; i++) {
          result[i] = list[i][index];
        }

        return result;
      }

      function buildList(first, rest, index) {
        return [first].concat(extractList(rest, index));
      }

      function buildTree(first, rest, builder) {
        var result = first, i;

        for (i = 0; i < rest.length; i++) {
          result = builder(result, rest[i]);
        }

        return result;
      }

      function buildInfixExpr(first, rest) {
        return buildTree(first, rest, function(result, element) {
          return {
            node:        'InfixExpression',
            operator:     element[0][0], // remove ending Spacing
            leftOperand:  result,
            rightOperand: element[1]
          };
        });
      }

      function buildQualified(first, rest, index) {
        return buildTree(first, rest, 
          function(result, element) {
            return {
              node:     'QualifiedName',
              qualifier: result,
              name:      element[index]
            };
          }
        );
      }

      function popQualified(tree) {
        return tree.node === 'QualifiedName' 
          ? { name: tree.name, expression: tree.qualifier }
          : { name: tree, expression: null };
      }

      function extractThrowsClassType(list) {
        return list.map(function(node){ 
          return node.name; 
        });
      }

      function extractExpressions(list) {
        return list.map(function(node) { 
          return node.expression; 
        });
      }

      function buildArrayTree(first, rest) {
        return buildTree(first, rest, 
          function(result, element) {
          return {
            node:         'ArrayType',
            componentType: result
          }; 
        });
      }

      function optionalList(value) {
        return value !== null ? value : [];
      }

      function extractOptionalList(list, index) {
        return optionalList(extractOptional(list, index));
      }

      function skipNulls(list) {
        return list.filter(function(v){ return v !== null; });
      }

      function makePrimitive(code) {
        return {
          node:             'PrimitiveType',
          primitiveTypeCode: code
        }
      }

      function makeModifier(keyword) {
        return { 
          node:   'Modifier', 
          keyword: keyword
        };
      }

      function makeCatchFinally(catchClauses, finallyBlock) {
          return { 
            catchClauses: catchClauses, 
            finally:      finallyBlock 
          };
      }

      function buildTypeName(qual, args, rest) {
        var first = args === null ? {
          node: 'SimpleType',
          name:  qual
        } : {
          node: 'ParameterizedType',
          type:  {
              node: 'SimpleType',
              name:  qual
          },
          typeArguments: args
        };

        return buildTree(first, rest, 
          function(result, element) {
            var args = element[2];
            return args === null ? {
              node:     'QualifiedType',
              name:      element[1],
              qualifier: result
            } :
            {
              node: 'ParameterizedType',
              type:  {
                node:     'QualifiedType',
                name:      element[1],
                qualifier: result
              },
              typeArguments: args
            };
          }
        );
      }

      function mergeProps(obj, props) {
        var key;
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            if (obj.hasOwnProperty(key)) {
              throw new Error(
                'Property ' + key + ' exists ' + line() + '\n' + text() + 
                '\nCurrent value: ' + JSON.stringify(obj[key], null, 2) + 
                '\nNew value: ' + JSON.stringify(props[key], null, 2)
              );
            } else {
              obj[key] = props[key];
            }
          }
        }
        return obj;
      }

      function buildSelectorTree(arg, sel, sels) {
        function getMergeVal(o,v) {
          switch(o.node){
            case 'SuperFieldAccess':
            case 'SuperMethodInvocation':
              return { qualifier: v };
            case 'ArrayAccess':
              return { array: v };
            default:
              return { expression: v };
          }
        }
        return buildTree(mergeProps(sel, getMergeVal(sel, arg)), 
          sels, function(result, element) {
            return mergeProps(element, getMergeVal(element, result));
        });
      }

      function leadingComments(comments) {
        const leadComments = [];

        for(var i = 0; i < comments.length; i++) {
          leadComments.push({
            ast_type: "comment",
            value: comments[i].value,
            leading: true,
            trailing: false,
            printed: false
          });
        }

        return leadComments;
      }

      function TODO() {
        throw new Error('TODO: not impl line ' + line() + '\n' + text());
      }


    peg$result = peg$parseRule(peg$startRuleIndex);

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail(peg$endExpectation());
      }

      throw peg$buildStructuredError(
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

// module.exports = parser;

export default parser;