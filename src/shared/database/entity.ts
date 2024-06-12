import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
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

  @Column({ type: "varchar", nullable: false })
  reserve0: bigint;

  @Column({ type: "varchar", nullable: false })
  reserve1: bigint;

  @Column({ type: "decimal", nullable: false })
  lpFee: number;

  @Column({ type: "decimal", nullable: false })
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
    this.lpFee = Number(this.lpFee);
    this.priceUSD = Number(this.priceUSD);

    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  preUpdate() {
    this.updatedAt = new Date();
  }

  @AfterLoad()
  preQuery() {
    this.lpFee = Number(this.lpFee);
    this.priceUSD = Number(this.priceUSD);
  }
}
