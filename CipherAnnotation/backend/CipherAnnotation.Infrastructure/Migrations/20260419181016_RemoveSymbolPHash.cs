using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveSymbolPHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PHash",
                table: "Symbols");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(1890),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 195, DateTimeKind.Utc).AddTicks(9020));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Symbols",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(5810),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(6220));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "SectionAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(5700),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(9770));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PairAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(8590),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(4410));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(9290),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(9830));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(7160),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(8480));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ElementAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(1530),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(9170));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(3800),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(6730));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5920),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4750));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5520),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4120));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 195, DateTimeKind.Utc).AddTicks(9020),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(1890));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Symbols",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(6220),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(5810));

            migrationBuilder.AddColumn<long>(
                name: "PHash",
                table: "Symbols",
                type: "bigint",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "SectionAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(9770),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(5700));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PairAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(4410),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(8590));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(9830),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(9290));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(8480),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(7160));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ElementAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(9170),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(1530));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(6730),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(3800));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4750),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5920));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4120),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5520));
        }
    }
}
