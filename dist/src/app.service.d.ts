import { HttpService } from '@nestjs/axios';
export declare class AppService {
    private readonly http;
    constructor(http: HttpService);
    getTransactionDetails(tx: any): Promise<any>;
    getTokenMetadata(tokenId: string): Promise<any>;
    tweet(data: any): Promise<void>;
    getBase64(url: string): Promise<string>;
}
