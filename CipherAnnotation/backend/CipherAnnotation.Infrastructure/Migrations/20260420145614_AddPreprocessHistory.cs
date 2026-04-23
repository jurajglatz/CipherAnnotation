using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPreprocessHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 819, DateTimeKind.Utc).AddTicks(9870),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(1890));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Symbols",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 824, DateTimeKind.Utc).AddTicks(1630),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(5810));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "SectionAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(4030),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(5700));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PairAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(9000),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(8590));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 821, DateTimeKind.Utc).AddTicks(2830),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(9290));

            migrationBuilder.AddColumn<Guid>(
                name: "CurrentPreprocessHistoryId",
                table: "Pages",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 826, DateTimeKind.Utc).AddTicks(7220),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(7160));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ElementAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 823, DateTimeKind.Utc).AddTicks(4160),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(1530));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(730),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(3800));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6980),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5920));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6240),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5520));

            migrationBuilder.CreateTable(
                name: "PreprocessHistoryEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sequence = table.Column<int>(type: "integer", nullable: false),
                    OperationsJson = table.Column<string>(type: "text", nullable: false),
                    ResultBlobId = table.Column<Guid>(type: "uuid", nullable: true),
                    PreviousBlobId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResultWidth = table.Column<int>(type: "integer", nullable: false),
                    ResultHeight = table.Column<int>(type: "integer", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 824, DateTimeKind.Utc).AddTicks(3740))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreprocessHistoryEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreprocessHistoryEntries_FileBlobs_ResultBlobId",
                        column: x => x.ResultBlobId,
                        principalTable: "FileBlobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PreprocessHistoryEntries_Pages_PageId",
                        column: x => x.PageId,
                        principalTable: "Pages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pages_CurrentPreprocessHistoryId",
                table: "Pages",
                column: "CurrentPreprocessHistoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PreprocessHistoryEntries_PageId_Sequence",
                table: "PreprocessHistoryEntries",
                columns: new[] { "PageId", "Sequence" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreprocessHistoryEntries_ResultBlobId",
                table: "PreprocessHistoryEntries",
                column: "ResultBlobId");

            migrationBuilder.AddForeignKey(
                name: "FK_Pages_PreprocessHistoryEntries_CurrentPreprocessHistoryId",
                table: "Pages",
                column: "CurrentPreprocessHistoryId",
                principalTable: "PreprocessHistoryEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Pages_PreprocessHistoryEntries_CurrentPreprocessHistoryId",
                table: "Pages");

            migrationBuilder.DropTable(
                name: "PreprocessHistoryEntries");

            migrationBuilder.DropIndex(
                name: "IX_Pages_CurrentPreprocessHistoryId",
                table: "Pages");

            migrationBuilder.DropColumn(
                name: "CurrentPreprocessHistoryId",
                table: "Pages");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(1890),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 819, DateTimeKind.Utc).AddTicks(9870));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Symbols",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(5810),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 824, DateTimeKind.Utc).AddTicks(1630));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "SectionAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(5700),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(4030));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PairAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(8590),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(9000));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(9290),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 821, DateTimeKind.Utc).AddTicks(2830));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(7160),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 826, DateTimeKind.Utc).AddTicks(7220));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "ElementAnnotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 339, DateTimeKind.Utc).AddTicks(1530),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 823, DateTimeKind.Utc).AddTicks(4160));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 338, DateTimeKind.Utc).AddTicks(3800),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(730));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5920),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6980));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 19, 18, 10, 16, 337, DateTimeKind.Utc).AddTicks(5520),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6240));
        }
    }
}
