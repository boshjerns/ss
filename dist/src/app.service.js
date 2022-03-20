"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const twit_1 = __importDefault(require("twit"));
const ethers_1 = require("ethers");
const web3_utils_1 = require("web3-utils");
const rxjs_1 = require("rxjs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const looksRareABI_json_1 = __importDefault(require("../abi/looksRareABI.json"));
const alchemyAPIUrl = 'https://eth-mainnet.alchemyapi.io/v2/';
const alchemyAPIKey = process.env.ALCHEMY_API_KEY;
const tokenContractAddress = '0xc88C928e2b7c0cC531D814f9A9C57cce7271a0e1';
const looksRareAddress = '0x59728544b08ab483533076417fbbb2fd0b17ce3a';
const provider = new ethers_1.ethers.providers.JsonRpcProvider(alchemyAPIUrl + alchemyAPIKey);
const looksInterface = new ethers_1.ethers.utils.Interface(looksRareABI_json_1.default);
const twitterConfig = {
    consumer_key: process.env.TW_CONSUMER_KEY,
    consumer_secret: process.env.TW_CONSUMER_SECRET,
    access_token: process.env.TW_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TW_ACCESS_TOKEN_SECRET,
};
const twitterClient = new twit_1.default(twitterConfig);
let AppService = class AppService {
    constructor(http) {
        this.http = http;
        provider.on({
            address: tokenContractAddress,
            topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
        }, (tx) => {
            this.getTransactionDetails(tx).then((res) => {
                console.log(res);
                if (res)
                    this.tweet(res);
            });
        });
    }
    async getTransactionDetails(tx) {
        var _a, _b, _c;
        try {
            const { transactionHash } = tx;
            const transaction = await provider.getTransaction(transactionHash);
            const { value } = transaction;
            const ether = ethers_1.ethers.utils.formatEther(value.toString());
            const receipt = await provider.getTransactionReceipt(transactionHash);
            const { from, to } = receipt;
            const tokenId = (0, web3_utils_1.hexToNumberString)(tx === null || tx === void 0 ? void 0 : tx.topics[3]);
            const imageUrl = await this.getTokenMetadata(tokenId);
            let looksRareValue = 0;
            const LR = receipt.logs.map((log) => {
                if (log.address.toLowerCase() === looksRareAddress.toLowerCase()) {
                    return looksInterface.parseLog(log);
                }
            }).filter((log) => (log === null || log === void 0 ? void 0 : log.name) === 'TakerAsk');
            if (LR.length) {
                const weiValue = (_c = ((_b = (_a = LR[0]) === null || _a === void 0 ? void 0 : _a.args) === null || _b === void 0 ? void 0 : _b.price)) === null || _c === void 0 ? void 0 : _c.toString();
                const value = ethers_1.ethers.utils.formatEther(weiValue);
                looksRareValue = parseFloat(value);
            }
            if (parseFloat(ether) || looksRareValue) {
                return {
                    from,
                    to,
                    tokenId,
                    ether: parseFloat(ether),
                    imageUrl,
                    transactionHash,
                    looksRareValue
                };
            }
            return null;
        }
        catch (err) {
            console.log(err);
            return null;
        }
    }
    async getTokenMetadata(tokenId) {
        const url = alchemyAPIUrl + alchemyAPIKey + '/getNFTMetadata';
        return await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
            params: {
                contractAddress: tokenContractAddress,
                tokenId,
                tokenType: 'erc721'
            }
        }).pipe((0, rxjs_1.map)((res) => {
            var _a, _b, _c, _d, _e, _f;
            return ((_b = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.metadata) === null || _b === void 0 ? void 0 : _b.image_url) || ((_d = (_c = res === null || res === void 0 ? void 0 : res.data) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d.image) || ((_f = (_e = res === null || res === void 0 ? void 0 : res.data) === null || _e === void 0 ? void 0 : _e.tokenUri) === null || _f === void 0 ? void 0 : _f.gateway);
        })));
    }
    async tweet(data) {
        const tweetText = `Camera Person #${data.tokenId} just sold for ${data.ether ? data.ether : data.looksRareValue} -- https://etherscan.io/tx/${data.transactionHash}`;
        const processedImage = await this.getBase64(data.imageUrl);
        twitterClient.post('media/upload', { media_data: processedImage }, (error, media, response) => {
            if (!error) {
                const tweet = { status: tweetText, media_ids: [media.media_id_string] };
                twitterClient.post('statuses/update', tweet, (error, tweet, response) => {
                    if (!error)
                        console.log(`Successfully tweeted: ${tweetText}`);
                    else
                        console.error(error);
                });
            }
            else
                console.error(error);
        });
    }
    async getBase64(url) {
        return await (0, rxjs_1.firstValueFrom)(this.http.get(url, { responseType: 'arraybuffer' }).pipe((0, rxjs_1.map)((res) => Buffer.from(res.data, 'binary').toString('base64'))));
    }
};
AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], AppService);
exports.AppService = AppService;
//# sourceMappingURL=app.service.js.map