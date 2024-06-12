import { MigrationInterface, QueryRunner } from "typeorm";

export class Ston1718202142050 implements MigrationInterface {
  name = "Ston1718202142050";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lp_entity" DROP COLUMN "reserve0"`);
    await queryRunner.query(`ALTER TABLE "lp_entity" ADD "reserve0" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lp_entity" DROP COLUMN "reserve1"`);
    await queryRunner.query(`ALTER TABLE "lp_entity" ADD "reserve1" character varying NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lp_entity" DROP COLUMN "reserve1"`);
    await queryRunner.query(`ALTER TABLE "lp_entity" ADD "reserve1" bigint NOT NULL`);
    await queryRunner.query(`ALTER TABLE "lp_entity" DROP COLUMN "reserve0"`);
    await queryRunner.query(`ALTER TABLE "lp_entity" ADD "reserve0" bigint NOT NULL`);
  }
}
