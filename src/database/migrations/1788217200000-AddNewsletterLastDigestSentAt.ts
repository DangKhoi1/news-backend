import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewsletterLastDigestSentAt1788217200000 implements MigrationInterface {
  name = 'AddNewsletterLastDigestSentAt1788217200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "newsletter_subscriptions" ADD COLUMN IF NOT EXISTS "lastDigestSentAt" TIMESTAMP WITH TIME ZONE',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "newsletter_subscriptions" DROP COLUMN IF EXISTS "lastDigestSentAt"',
    );
  }
}
