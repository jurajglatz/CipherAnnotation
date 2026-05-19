using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CipherAnnotation.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MakeSymbolImageOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Symbols_FileBlobs_ImageBlobId",
                table: "Symbols");

            migrationBuilder.AlterColumn<Guid>(
                name: "ImageBlobId",
                table: "Symbols",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddForeignKey(
                name: "FK_Symbols_FileBlobs_ImageBlobId",
                table: "Symbols",
                column: "ImageBlobId",
                principalTable: "FileBlobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Symbols_FileBlobs_ImageBlobId",
                table: "Symbols");

            migrationBuilder.AlterColumn<Guid>(
                name: "ImageBlobId",
                table: "Symbols",
                type: "uuid",
                nullable: false,
                defaultValue: Guid.Empty,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Symbols_FileBlobs_ImageBlobId",
                table: "Symbols",
                column: "ImageBlobId",
                principalTable: "FileBlobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
