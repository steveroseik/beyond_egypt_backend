import { UserInputError } from '@nestjs/apollo';
import Decimal from 'decimal.js';
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

export const GraphqlDecimal = new GraphQLScalarType<Decimal, String>({
  name: 'Decimal',
  description: 'Decimal custom scalar type',
  parseValue(value: string) {
    return new Decimal(value); // value from the client
  },
  serialize(value: Decimal) {
    return value.toString(); // value sent to the client
  },
  parseLiteral(ast: ValueNode) {
    if (
      ast.kind === Kind.STRING ||
      ast.kind === Kind.INT ||
      ast.kind === Kind.FLOAT
    ) {
      return new Decimal(ast.value); // ast value is always in string format
    }
    return null;
  },
});
