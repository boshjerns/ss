"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    await core_1.NestFactory.create(app_module_1.AppModule);
}
bootstrap();
//# sourceMappingURL=main.js.map