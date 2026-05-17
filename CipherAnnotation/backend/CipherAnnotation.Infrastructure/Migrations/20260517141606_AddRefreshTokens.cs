using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(3630),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(5152));

            migrationBuilder.AlterColumn<DateTime>(
                name: "AppliedAt",
                table: "PreprocessHistoryEntries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 919, DateTimeKind.Utc).AddTicks(2079),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 476, DateTimeKind.Utc).AddTicks(6122));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(8960),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 472, DateTimeKind.Utc).AddTicks(4984));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 920, DateTimeKind.Utc).AddTicks(1427),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 478, DateTimeKind.Utc).AddTicks(1409));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 917, DateTimeKind.Utc).AddTicks(1919),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(270));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(5964),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(9114));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(5737),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(8752));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Captions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 917, DateTimeKind.Utc).AddTicks(3324),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(2877));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Annotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 917, DateTimeKind.Utc).AddTicks(4252),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(4494));

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 920, DateTimeKind.Utc).AddTicks(1892)),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(5152),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(3630));

            migrationBuilder.AlterColumn<DateTime>(
                name: "AppliedAt",
                table: "PreprocessHistoryEntries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 476, DateTimeKind.Utc).AddTicks(6122),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 919, DateTimeKind.Utc).AddTicks(2079));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 472, DateTimeKind.Utc).AddTicks(4984),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(8960));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 478, DateTimeKind.Utc).AddTicks(1409),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 920, DateTimeKind.Utc).AddTicks(1427));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(270),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 917, DateTimeKind.Utc).AddTicks(1919));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(9114),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(5964));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(8752),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 916, DateTimeKind.Utc).AddTicks(5737));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Captions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(2877),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 917, DateTimeKind.Utc).AddTicks(3324));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Annotations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(4494),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 5, 17, 14, 16, 5, 917, DateTimeKind.Utc).AddTicks(4252));
        }
    }
}
