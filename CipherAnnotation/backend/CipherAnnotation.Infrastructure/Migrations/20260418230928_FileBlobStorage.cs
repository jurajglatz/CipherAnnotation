using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FileBlobStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreviewImagePath",
                table: "Symbols");

            migrationBuilder.DropColumn(
                name: "ImagePath",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "ProcessedImagePath",
                table: "Pages");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 195, DateTimeKind.Utc).AddTicks(9020),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(500));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Symbols",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(6220),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(9150));

            migrationBuilder.AddColumn<Guid>(
                name: "PreviewImageBlobId",
                table: "Symbols",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "SectionAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(9770),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(640));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PairAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(4410),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(3330));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(9830),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(6460));

            migrationBuilder.AddColumn<Guid>(
                name: "ImageBlobId",
                table: "Pages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "ProcessedImageBlobId",
                table: "Pages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ElementAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(9170),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(5890));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(6730),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(8740));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4750),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(3710));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4120),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(3320));

            migrationBuilder.CreateTable(
                name: "FileBlobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Data = table.Column<byte[]>(type: "bytea", nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(8480))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileBlobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_PreviewImageBlobId",
                table: "Symbols",
                column: "PreviewImageBlobId");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_ImageBlobId",
                table: "Pages",
                column: "ImageBlobId");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_ProcessedImageBlobId",
                table: "Pages",
                column: "ProcessedImageBlobId");

            migrationBuilder.CreateIndex(
                name: "IX_FileBlobs_Sha256",
                table: "FileBlobs",
                column: "Sha256");

            migrationBuilder.AddForeignKey(
                name: "FK_Pages_FileBlobs_ImageBlobId",
                table: "Pages",
                column: "ImageBlobId",
                principalTable: "FileBlobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Pages_FileBlobs_ProcessedImageBlobId",
                table: "Pages",
                column: "ProcessedImageBlobId",
                principalTable: "FileBlobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Symbols_FileBlobs_PreviewImageBlobId",
                table: "Symbols",
                column: "PreviewImageBlobId",
                principalTable: "FileBlobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pages_FileBlobs_ImageBlobId",
                table: "Pages");

            migrationBuilder.DropForeignKey(
                name: "FK_Pages_FileBlobs_ProcessedImageBlobId",
                table: "Pages");

            migrationBuilder.DropForeignKey(
                name: "FK_Symbols_FileBlobs_PreviewImageBlobId",
                table: "Symbols");

            migrationBuilder.DropTable(
                name: "FileBlobs");

            migrationBuilder.DropIndex(
                name: "IX_Symbols_PreviewImageBlobId",
                table: "Symbols");

            migrationBuilder.DropIndex(
                name: "IX_Pages_ImageBlobId",
                table: "Pages");

            migrationBuilder.DropIndex(
                name: "IX_Pages_ProcessedImageBlobId",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "PreviewImageBlobId",
                table: "Symbols");

            migrationBuilder.DropColumn(
                name: "ImageBlobId",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "ProcessedImageBlobId",
                table: "Pages");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(500),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 195, DateTimeKind.Utc).AddTicks(9020));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Symbols",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(9150),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 199, DateTimeKind.Utc).AddTicks(6220));

            migrationBuilder.AddColumn<string>(
                name: "PreviewImagePath",
                table: "Symbols",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "SectionAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(640),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(9770));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PairAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(3330),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(4410));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(6460),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(9830));

            migrationBuilder.AddColumn<string>(
                name: "ImagePath",
                table: "Pages",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ProcessedImagePath",
                table: "Pages",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ElementAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(5890),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 198, DateTimeKind.Utc).AddTicks(9170));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(8740),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 197, DateTimeKind.Utc).AddTicks(6730));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(3710),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4750));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(3320),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 18, 23, 9, 28, 196, DateTimeKind.Utc).AddTicks(4120));
        }
    }
}
