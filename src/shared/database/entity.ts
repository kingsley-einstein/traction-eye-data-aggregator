import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { LPSourceIdentifiers } from "../../constants";
import { randomUUID } from "crypto";

export abstract class SharedLPEntity {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ type: "varchar", nullable: false })
  onChainId: string;

  @Column({ type: "enum", enum: LPSourceIdentifiers })
  exchangeIdentifier: LPSourceIdentifiers;

  @Column({ type: "varchar", nullable: false })
  token0Address: string;

  @Column({ type: "varchar", nullable: false })
  token1Address: string;

  @Column({ type: "bigint", nullable: false })
  reserve0: bigint;

  @Column({ type: "bigint", nullable: false })
  reserve1: bigint;

  @Column({ type: "double", nullable: false })
  lpFee: number;

  @Column({ type: "double", nullable: false })
  priceUSD: number;

  @CreateDateColumn({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP(6)" })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  updatedAt!: Date;

  @BeforeInsert()
  sharedPreInsert() {
    this.id = randomUUID();

    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  preUpdate() {
    this.updatedAt = new Date();
  }
}
