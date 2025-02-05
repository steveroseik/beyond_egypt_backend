import { createHash } from "crypto";


export function gameInitSHA256(value:string ): string {
     // Calculate and return SHA256 hash
    const hash = createHash('sha256', {encoding: 'utf-8'}).update(value).digest('hex');
    
    return hash;
}