using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UnifyAnnotations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Clean wipe: orphan all bounding-box rows so the new FK to Annotations can be added.
            migrationBuilder.Sql("DELETE FROM \"BoundingBoxes\";");

            migrationBuilder.DropForeignKey(
                name: "FK_BoundingBoxes_ElementAnnotations_ElementId",
                table: "BoundingBoxes");

            migrationBuilder.DropForeignKey(
                name: "FK_BoundingBoxes_PairAnnotations_PairId",
                table: "BoundingBoxes");

            migrationBuilder.DropForeignKey(
                name: "FK_BoundingBoxes_SectionAnnotations_SectionId",
                table: "BoundingBoxes");

            migrationBuilder.DropTable(
                name: "ElementAnnotations");

            migrationBuilder.DropTable(
                name: "PairAnnotations");

            migrationBuilder.DropTable(
                name: "Symbols");

            migrationBuilder.DropTable(
                name: "SectionAnnotations");

            migrationBuilder.DropIndex(
                name: "IX_BoundingBoxes_ElementId",
                table: "BoundingBoxes");

            migrationBuilder.DropIndex(
                name: "IX_BoundingBoxes_PairId",
                table: "BoundingBoxes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_BoundingBox_SingleFK",
                table: "BoundingBoxes");

            migrationBuilder.DropColumn(
                name: "ElementId",
                table: "BoundingBoxes");

            migrationBuilder.DropColumn(
                name: "PairId",
                table: "BoundingBoxes");

            migrationBuilder.RenameColumn(
                name: "SectionId",
                table: "BoundingBoxes",
                newName: "AnnotationId");

            migrationBuilder.RenameIndex(
                name: "IX_BoundingBoxes_SectionId",
                table: "BoundingBoxes",
                newName: "IX_BoundingBoxes_AnnotationId");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(5152),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 819, DateTimeKind.Utc).AddTicks(9870));

            migrationBuilder.AlterColumn<DateTime>(
                name: "AppliedAt",
                table: "PreprocessHistoryEntries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 476, DateTimeKind.Utc).AddTicks(6122),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 824, DateTimeKind.Utc).AddTicks(3740));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 472, DateTimeKind.Utc).AddTicks(4984),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 821, DateTimeKind.Utc).AddTicks(2830));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 478, DateTimeKind.Utc).AddTicks(1409),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 826, DateTimeKind.Utc).AddTicks(7220));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(270),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(730));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(9114),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6980));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(8752),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6240));

            migrationBuilder.CreateTable(
                name: "Captions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(2877))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Captions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Captions_Documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Annotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CaptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Transcription = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    TranscriptionRefId = table.Column<Guid>(type: "uuid", nullable: true),
                    Orientation = table.Column<float>(type: "real", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(4494))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Annotations", x => x.Id);
                    table.CheckConstraint("CK_Annotation_TypeFields", "(\"Type\" = 'Text'   AND \"Transcription\" IS NULL AND \"TranscriptionRefId\" IS NULL) OR (\"Type\" = 'Cipher' AND \"TranscriptionRefId\" IS NULL) OR (\"Type\" = 'Symbol' AND \"Transcription\" IS NULL)");
                    table.ForeignKey(
                        name: "FK_Annotations_Annotations_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Annotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Annotations_Annotations_TranscriptionRefId",
                        column: x => x.TranscriptionRefId,
                        principalTable: "Annotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Annotations_Captions_CaptionId",
                        column: x => x.CaptionId,
                        principalTable: "Captions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Annotations_Pages_PageId",
                        column: x => x.PageId,
                        principalTable: "Pages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_CaptionId",
                table: "Annotations",
                column: "CaptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_PageId_CaptionId_CreatedAt",
                table: "Annotations",
                columns: new[] { "PageId", "CaptionId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_ParentId",
                table: "Annotations",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Annotations_TranscriptionRefId",
                table: "Annotations",
                column: "TranscriptionRefId");

            migrationBuilder.CreateIndex(
                name: "IX_Captions_DocumentId_CreatedAt",
                table: "Captions",
                columns: new[] { "DocumentId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Captions_DocumentId_Name",
                table: "Captions",
                columns: new[] { "DocumentId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BoundingBoxes_Annotations_AnnotationId",
                table: "BoundingBoxes",
                column: "AnnotationId",
                principalTable: "Annotations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BoundingBoxes_Annotations_AnnotationId",
                table: "BoundingBoxes");

            migrationBuilder.DropTable(
                name: "Annotations");

            migrationBuilder.DropTable(
                name: "Captions");

            migrationBuilder.RenameColumn(
                name: "AnnotationId",
                table: "BoundingBoxes",
                newName: "SectionId");

            migrationBuilder.RenameIndex(
                name: "IX_BoundingBoxes_AnnotationId",
                table: "BoundingBoxes",
                newName: "IX_BoundingBoxes_SectionId");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 819, DateTimeKind.Utc).AddTicks(9870),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(5152));

            migrationBuilder.AlterColumn<DateTime>(
                name: "AppliedAt",
                table: "PreprocessHistoryEntries",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 824, DateTimeKind.Utc).AddTicks(3740),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 476, DateTimeKind.Utc).AddTicks(6122));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Pages",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 821, DateTimeKind.Utc).AddTicks(2830),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 472, DateTimeKind.Utc).AddTicks(4984));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "FileBlobs",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 826, DateTimeKind.Utc).AddTicks(7220),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 478, DateTimeKind.Utc).AddTicks(1409));

            migrationBuilder.AlterColumn<DateTime>(
                name: "SharedAt",
                table: "DocumentShares",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(730),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 473, DateTimeKind.Utc).AddTicks(270));

            migrationBuilder.AlterColumn<DateTime>(
                name: "UpdatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6980),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(9114));

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "Documents",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 820, DateTimeKind.Utc).AddTicks(6240),
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValue: new DateTime(2026, 4, 28, 23, 7, 20, 471, DateTimeKind.Utc).AddTicks(8752));

            migrationBuilder.AddColumn<Guid>(
                name: "ElementId",
                table: "BoundingBoxes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PairId",
                table: "BoundingBoxes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SectionAnnotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(4030)),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Orientation = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SectionAnnotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SectionAnnotations_Pages_PageId",
                        column: x => x.PageId,
                        principalTable: "Pages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Symbols",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PreviewImageBlobId = table.Column<Guid>(type: "uuid", nullable: true),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 824, DateTimeKind.Utc).AddTicks(1630))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Symbols", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Symbols_FileBlobs_PreviewImageBlobId",
                        column: x => x.PreviewImageBlobId,
                        principalTable: "FileBlobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PairAnnotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 822, DateTimeKind.Utc).AddTicks(9000)),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Orientation = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PairAnnotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PairAnnotations_SectionAnnotations_SectionId",
                        column: x => x.SectionId,
                        principalTable: "SectionAnnotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ElementAnnotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PairId = table.Column<Guid>(type: "uuid", nullable: false),
                    SymbolId = table.Column<Guid>(type: "uuid", nullable: true),
                    Content = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 20, 14, 56, 13, 823, DateTimeKind.Utc).AddTicks(4160)),
                    Orientation = table.Column<float>(type: "real", nullable: false),
                    Transcription = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ElementAnnotations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ElementAnnotations_PairAnnotations_PairId",
                        column: x => x.PairId,
                        principalTable: "PairAnnotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ElementAnnotations_Symbols_SymbolId",
                        column: x => x.SymbolId,
                        principalTable: "Symbols",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BoundingBoxes_ElementId",
                table: "BoundingBoxes",
                column: "ElementId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BoundingBoxes_PairId",
                table: "BoundingBoxes",
                column: "PairId",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_BoundingBox_SingleFK",
                table: "BoundingBoxes",
                sql: "(CASE WHEN \"SectionId\" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN \"PairId\" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN \"ElementId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ElementAnnotations_PairId",
                table: "ElementAnnotations",
                column: "PairId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementAnnotations_SymbolId",
                table: "ElementAnnotations",
                column: "SymbolId");

            migrationBuilder.CreateIndex(
                name: "IX_PairAnnotations_SectionId",
                table: "PairAnnotations",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_SectionAnnotations_PageId",
                table: "SectionAnnotations",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_Code",
                table: "Symbols",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Symbols_PreviewImageBlobId",
                table: "Symbols",
                column: "PreviewImageBlobId");

            migrationBuilder.AddForeignKey(
                name: "FK_BoundingBoxes_ElementAnnotations_ElementId",
                table: "BoundingBoxes",
                column: "ElementId",
                principalTable: "ElementAnnotations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BoundingBoxes_PairAnnotations_PairId",
                table: "BoundingBoxes",
                column: "PairId",
                principalTable: "PairAnnotations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BoundingBoxes_SectionAnnotations_SectionId",
                table: "BoundingBoxes",
                column: "SectionId",
                principalTable: "SectionAnnotations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
