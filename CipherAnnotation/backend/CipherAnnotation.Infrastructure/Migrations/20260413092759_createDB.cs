using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class createDB : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Symbols",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PreviewImagePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(9150))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Symbols", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    AvatarUri = table.Column<string>(type: "text", nullable: true),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(500))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    OriginCountry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Author = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Language = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Visibility = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(3320)),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(3710))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Documents_Users_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DocumentShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Permission = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(8740))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentShares_Documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DocumentShares_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Pages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PageNumber = table.Column<int>(type: "integer", nullable: false),
                    ImagePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ProcessedImagePath = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    Orientation = table.Column<float>(type: "real", nullable: false),
                    ResolutionDPI = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 20, DateTimeKind.Utc).AddTicks(6460))
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pages", x => x.Id);
                    table.CheckConstraint("CK_Page_PageNumber", "\"PageNumber\" >= 1 AND \"PageNumber\" <= 100");
                    table.ForeignKey(
                        name: "FK_Pages_Documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SectionAnnotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Orientation = table.Column<float>(type: "real", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(640))
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
                name: "PairAnnotations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    Orientation = table.Column<float>(type: "real", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(3330))
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
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Content = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Transcription = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Orientation = table.Column<float>(type: "real", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValue: new DateTime(2026, 4, 13, 9, 27, 51, 21, DateTimeKind.Utc).AddTicks(5890))
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

            migrationBuilder.CreateTable(
                name: "BoundingBoxes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: true),
                    PairId = table.Column<Guid>(type: "uuid", nullable: true),
                    ElementId = table.Column<Guid>(type: "uuid", nullable: true),
                    X = table.Column<float>(type: "real", nullable: false),
                    Y = table.Column<float>(type: "real", nullable: false),
                    Width = table.Column<float>(type: "real", nullable: false),
                    Height = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoundingBoxes", x => x.Id);
                    table.CheckConstraint("CK_BoundingBox_SingleFK", "(CASE WHEN \"SectionId\" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN \"PairId\" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN \"ElementId\" IS NOT NULL THEN 1 ELSE 0 END) = 1");
                    table.ForeignKey(
                        name: "FK_BoundingBoxes_ElementAnnotations_ElementId",
                        column: x => x.ElementId,
                        principalTable: "ElementAnnotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BoundingBoxes_PairAnnotations_PairId",
                        column: x => x.PairId,
                        principalTable: "PairAnnotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BoundingBoxes_SectionAnnotations_SectionId",
                        column: x => x.SectionId,
                        principalTable: "SectionAnnotations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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

            migrationBuilder.CreateIndex(
                name: "IX_BoundingBoxes_SectionId",
                table: "BoundingBoxes",
                column: "SectionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Documents_OwnerId",
                table: "Documents",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Documents_Visibility",
                table: "Documents",
                column: "Visibility");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentShares_DocumentId_UserId",
                table: "DocumentShares",
                columns: new[] { "DocumentId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentShares_UserId",
                table: "DocumentShares",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementAnnotations_PairId",
                table: "ElementAnnotations",
                column: "PairId");

            migrationBuilder.CreateIndex(
                name: "IX_ElementAnnotations_SymbolId",
                table: "ElementAnnotations",
                column: "SymbolId");

            migrationBuilder.CreateIndex(
                name: "IX_Pages_DocumentId_PageNumber",
                table: "Pages",
                columns: new[] { "DocumentId", "PageNumber" },
                unique: true);

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
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BoundingBoxes");

            migrationBuilder.DropTable(
                name: "DocumentShares");

            migrationBuilder.DropTable(
                name: "ElementAnnotations");

            migrationBuilder.DropTable(
                name: "PairAnnotations");

            migrationBuilder.DropTable(
                name: "Symbols");

            migrationBuilder.DropTable(
                name: "SectionAnnotations");

            migrationBuilder.DropTable(
                name: "Pages");

            migrationBuilder.DropTable(
                name: "Documents");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
