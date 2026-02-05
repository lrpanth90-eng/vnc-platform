import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PlatformGuard } from './guards/platform.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalGuards(app.get(PlatformGuard));

  app.enableCors({
    origin: true,
    credentials: true
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
