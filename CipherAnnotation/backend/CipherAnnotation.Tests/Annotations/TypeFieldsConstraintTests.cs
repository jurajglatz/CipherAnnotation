using CipherAnnotation.Infrastructure.Services.Annotations;

namespace CipherAnnotation.Tests.Annotations;

// Guards against drift between AnnotationService.ValidateTypeFields and the
// CK_Annotation_TypeFields check constraint defined in AppDbContext. The two
// must accept and reject the same (Type, Transcription, TranscriptionRefId,
// SymbolId) combinations, otherwise rows the service rejects could be
// inserted via raw SQL — or rows the service builds could be rejected by the
// DB at insert time.
public class TypeFieldsConstraintTests
{
    public static IEnumerable<object?[]> AllCombinations()
    {
        var sampleGuid = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var sampleSymbol = Guid.Parse("22222222-2222-2222-2222-222222222222");
        foreach (var type in new[] { AnnotationType.Text, AnnotationType.Cipher, AnnotationType.Symbol })
        foreach (var transcription in new string?[] { null, "txt" })
        foreach (var refId in new Guid?[] { null, sampleGuid })
        foreach (var symbolId in new Guid?[] { null, sampleSymbol })
            yield return new object?[] { type, transcription, refId, symbolId };
    }

    [Theory]
    [MemberData(nameof(AllCombinations))]
    public void ServiceValidation_MatchesDbCheckConstraint(
        AnnotationType type, string? transcription, Guid? transcriptionRefId, Guid? symbolId)
    {
        var serviceAccepts = AnnotationService.ValidateTypeFields(
            type, transcription, transcriptionRefId, symbolId, out _);

        var dbAccepts = MatchesCheckConstraint(type, transcription, transcriptionRefId, symbolId);

        serviceAccepts.Should().Be(dbAccepts,
            $"({type}, transcription={transcription ?? "NULL"}, refId={transcriptionRefId?.ToString() ?? "NULL"}, symbolId={symbolId?.ToString() ?? "NULL"})");
    }

    // Mirror of CK_Annotation_TypeFields in AppDbContext.OnModelCreating.
    // If the SQL constraint changes, update this method too — the test will then
    // verify the service still agrees with the new rule.
    private static bool MatchesCheckConstraint(AnnotationType type, string? transcription, Guid? transcriptionRefId, Guid? symbolId)
        => type switch
        {
            AnnotationType.Text => transcription is null && transcriptionRefId is null && symbolId is null,
            AnnotationType.Cipher => transcriptionRefId is null && symbolId is null,
            AnnotationType.Symbol => transcription is null,
            _ => false,
        };
}
