using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSymbolEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Annotation_TypeFields",
                table: "Annotations");

            migrationBuilder.AddColumn<Guid>(
                name: "SymbolId",
                table: "Annotations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Symbols",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ImageBlobId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Symbols", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Symbols_FileBlobs_ImageBlobId",
                        column: x => x.ImageBlobId,
                        principalTable: "FileBlobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Symbols_Users_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_SymbolId",
                table: "Annotations",
                column: "SymbolId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Annotation_TypeFields",
                table: "Annotations",
                sql: "(\"Type\" = 'Text'   AND \"Transcription\" IS NULL AND \"TranscriptionRefId\" IS NULL AND \"SymbolId\" IS NULL) OR (\"Type\" = 'Cipher' AND \"TranscriptionRefId\" IS NULL AND \"SymbolId\" IS NULL) OR (\"Type\" = 'Symbol' AND \"Transcription\" IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_Content",
                table: "Symbols",
                column: "Content");

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_ImageBlobId",
                table: "Symbols",
                column: "ImageBlobId");

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_OwnerUserId",
                table: "Symbols",
                column: "OwnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Annotations_Symbols_SymbolId",
                table: "Annotations",
                column: "SymbolId",
                principalTable: "Symbols",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Annotations_Symbols_SymbolId",
                table: "Annotations");

            migrationBuilder.DropTable(
                name: "Symbols");

            migrationBuilder.DropIndex(
                name: "IX_Annotations_SymbolId",
                table: "Annotations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Annotation_TypeFields",
                table: "Annotations");

            migrationBuilder.DropColumn(
                name: "SymbolId",
                table: "Annotations");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Annotation_TypeFields",
                table: "Annotations",
                sql: "(\"Type\" = 'Text'   AND \"Transcription\" IS NULL AND \"TranscriptionRefId\" IS NULL) OR (\"Type\" = 'Cipher' AND \"TranscriptionRefId\" IS NULL) OR (\"Type\" = 'Symbol' AND \"Transcription\" IS NULL)");
        }
    }
}
