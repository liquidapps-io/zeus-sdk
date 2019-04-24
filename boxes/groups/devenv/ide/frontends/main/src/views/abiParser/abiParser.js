
import parser from './parser.js';
// var parser = require('./parser.js');
// var fs = require('fs');

function abiParser(){

    var abi = {
        version: "eosio::abi/1.0",
        types: [],
        structs: [],
        actions: [],
        tables: []
    }

    // parse action
    function createActions(TypeDefine){
        var actions = [];
        var bodyDeclarations = TypeDefine.bodyDeclarations;
        bodyDeclarations.forEach((bodyDeclaration) => {
            if(bodyDeclaration.node == 'MethodDeclaration'){
                var methodExtracted = parseActionMethod(bodyDeclaration);
                actions.push(methodExtracted.action);
                abi.structs.push(methodExtracted.actionStruct);
            }
        })

        abi.actions = actions;
    }

    function parseActionMethod(bodyDeclaration){
        var actionDef = {};
        var actionStruct = {
                "name": "",
                "base": "",
                "fields": []
            }

        actionDef.name = bodyDeclaration.name.identifier;
        actionDef.type = actionDef.name;
        actionDef.ricardian_contract = "";
        actionStruct.name = actionDef.type;

        bodyDeclaration.parameters.forEach((parameter) => {
            if(parameter.node == 'SingleVariableDeclaration'){
                var parameterDef = {};
                parameterDef.name = parameter.name.identifier;
                parameterDef.type = parameter.type.name.identifier;
                actionStruct.fields.push(parameterDef);
            }
        })

        return {
            action: actionDef,
            actionStruct: actionStruct
        }
    }



    // create database define
    function createDatabase(TypeDefine){
        var tableStruct = {};

        tableStruct.name = TypeDefine.name.identifier;
        TypeDefine.bodyDeclarations.forEach((bodyDeclaration) => {
            if(bodyDeclaration.node == 'FieldDeclaration'){
                var type = bodyDeclaration.type.name.identifier;
                var typeValues = [];
                if(bodyDeclaration.fragments){
                    bodyDeclaration.fragments.forEach((fragment) => {
                        if(fragment.node == 'VariableDeclarationFragment')  typeValues.push(fragment.name.identifier);
                    })
                }

                if(type == "key_names" || type == "key_types"){
                    tableStruct[type] = typeValues;
                }else{
                    tableStruct[type] = typeValues[0]
                }
            }
        })

        abi.tables.push(tableStruct);
    }

    // create struct
    function createStruct(TypeDefine){
        var structDef = {};

        structDef.name = TypeDefine.name.identifier;
        structDef.base = '';
        structDef.fields = [];

        TypeDefine.bodyDeclarations.forEach((bodyDeclaration) => {
            if(bodyDeclaration.node == 'FieldDeclaration'){
                var type = '';
                if(bodyDeclaration.type.node == "ArrayType"){
                    type = bodyDeclaration.type.componentType.name.identifier+"[]";
                }else{
                    type = bodyDeclaration.type.name.identifier;
                }

                var typeValues = [];
                if(bodyDeclaration.fragments){
                    bodyDeclaration.fragments.forEach((fragment) => {
                        if(fragment.node == 'VariableDeclarationFragment')  typeValues.push(fragment.name.identifier);
                    })
                }

                structDef.fields.push({
                    name: typeValues[0],
                    type: type
                })
            }
        })

        abi.structs.push(structDef);
    }


    function parseABI(content){
        var results = parser.parse(content);
        results.types.forEach((Type) => {
            if(Type.superclassType &&  Type.superclassType.name.identifier == "db"){
                return  createDatabase(Type);
            }
            // table define
            if(Type.interface){
                return createActions(Type);
            }
            return createStruct(Type);
        })
        return abi;
    }

    return {
        parse: parseABI
    }
}



// var content = fs.readFileSync('./abiDefine.java', 'utf-8');
// var testParser = new abiParser();
// var abi = testParser.parse(content);

// console.log(JSON.stringify(abi));
export default abiParser;