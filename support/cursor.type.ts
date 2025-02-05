import { UserInputError } from "@nestjs/apollo";
import { GraphQLScalarType, Kind } from "graphql"
import { Cursor } from "typeorm-cursor-pagination";

export const GraphqlCursor  = new GraphQLScalarType({
    name: "GraphqlCursor",
    description: "Cursor scalar type for pagination",
    serialize: (value:Cursor) => {
        return value;
    },

    parseValue: (value) => {

        console.log('parsed to: ', value);
        return value;
    },
    parseLiteral: (ast) => {
        console.log('parsed: ', ast.kind);
        if (ast.kind == Kind.STRING){
             const parsed = JSON.parse(ast.value);
             
             return parsed;
        }
        throw new UserInputError('cannot parse graphqlCursor');
    }
})