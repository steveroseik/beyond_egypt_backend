import { UserInputError } from '@nestjs/apollo';
import BigNumber from 'bignumber.js';
import { GraphQLScalarType } from 'graphql';
import { ValueNode, Kind } from 'graphql';

export const GraphqlPoint = new GraphQLScalarType({
  name: 'GraphqlPoint',
  description: 'MYSQL Point representation of coordinates.',
  serialize: (value: string) => {
    const newVal = value.replace('POINT(', '').replace(')', '').split(' ');
    return {
      long: newVal[0],
      lat: newVal[1],
    };
  },

  parseValue: (value: JSON) => {
    console.log('parsed to: ', value);
    return `POINT(${value['lat']} ${value['long']})`;
  },
  parseLiteral: (ast) => {
    if (ast.kind == Kind.OBJECT) {
      let long: number;
      let lat;
      ast.fields[1].name;
      ast.fields.forEach((field) => {
        if (field.name.value == 'long') long = field.value['value'];
        if (field.name.value == 'lat') lat = field.value['value'];
      });

      if (long === undefined || lat === undefined)
        throw new UserInputError('cannot parse location input');

      return `POINT(${lat} ${long})`;
    }
    throw new UserInputError('cannot parse location input');
  },
});

export class Decimal extends BigNumber {
  constructor(value: string) {
    super(value);
  }
}

export const GraphqlDecimal = new GraphQLScalarType<BigNumber, string>({
  name: 'Decimal',
  description: 'Decimal custom scalar type',
  parseValue(value: string) {
    return new BigNumber(value); // Convert from client value
  },
  serialize(value: Decimal) {
    return value.toString(); // Convert to string for client
  },
  parseLiteral(ast: ValueNode) {
    if (
      ast.kind === Kind.STRING ||
      ast.kind === Kind.INT ||
      ast.kind === Kind.FLOAT
    ) {
      const newVal = new Decimal(ast.value); // Convert AST value to Decimal

      return newVal;
    }
    return null;
  },
});
