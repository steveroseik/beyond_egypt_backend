import { Field, ObjectType } from "@nestjs/graphql";
import { GraphqlCursor } from "./cursor.type";
import { Cursor } from "typeorm-cursor-pagination";

@ObjectType()
export class PaginationResponse{

    @Field(() => GraphqlCursor)
    cursor:Cursor
    
}