import { MigrationInterface, QueryRunner } from "typeorm";

export class Ston1718196848438 implements MigrationInterface {
  name = "Ston1718196848438";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."lp_entity_exchange_identifier_enum" AS ENUM('ston.fi', 'dedust')`);
    await queryRunner.query(
      `CREATE TABLE "lp_entity" ("id" uuid NOT NULL, "on_chain_id" character varying NOT NULL, "exchange_identifier" "public"."lp_entity_exchange_identifier_enum" NOT NULL, "token0_address" character varying NOT NULL, "token1_address" character varying NOT NULL, "reserve0" bigint NOT NULL, "reserve1" bigint NOT NULL, "lp_fee" numeric NOT NULL, "price_usd" numeric NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, CONSTRAINT "PK_8d9e4cad3a8273e94e1277a2882" PRIMARY KEY ("id"))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lp_entity"`);
    await queryRunner.query(`DROP TYPE "public"."lp_entity_exchange_identifier_enum"`);
  }
}
