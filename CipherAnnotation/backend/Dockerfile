# syntax=docker/dockerfile:1.7

# ---------- build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore (cached layer): copy only csproj files first
COPY CipherAnnotation.Core/CipherAnnotation.Core.csproj           CipherAnnotation.Core/
COPY CipherAnnotation.Infrastructure/CipherAnnotation.Infrastructure.csproj CipherAnnotation.Infrastructure/
COPY CipherAnnotation.API/CipherAnnotation.API.csproj             CipherAnnotation.API/
COPY CipherAnnotation.Tests/CipherAnnotation.Tests.csproj         CipherAnnotation.Tests/
RUN dotnet restore CipherAnnotation.API/CipherAnnotation.API.csproj

# Copy the rest of the source and publish
COPY . .
RUN dotnet publish CipherAnnotation.API/CipherAnnotation.API.csproj \
    -c Release -o /app/publish --no-restore /p:UseAppHost=false

# ---------- runtime stage ----------
# ASP.NET 8 runtime + Python 3 + ultralytics (CPU-only torch) for the YOLO sidecar.
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# System packages: python, pip, libgl/libglib (required by opencv-python pulled in by ultralytics).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        python3 python3-pip python3-venv \
        libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Install Python ML deps into a venv to keep them isolated from system python.
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install CPU-only torch first (much smaller than the default CUDA wheel), then
# ultralytics (YOLO sidecar) and transformers+Pillow (TrOCR sidecar).
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir \
        --index-url https://download.pytorch.org/whl/cpu \
        torch==2.4.1 torchvision==0.19.1 \
 && pip install --no-cache-dir \
        ultralytics==8.3.40 \
        transformers==4.46.3 \
        Pillow==11.0.0 \
        sentencepiece==0.2.0 \
        protobuf==5.28.3 \
        tiktoken==0.8.0

# Make the venv's python the one the .NET sidecar invokes.
ENV AutoAnnotation__PythonExecutable=/opt/venv/bin/python3

# Pre-download the TrOCR handwriting model at build time so the first request
# doesn't pay the ~30 s download cost. Cached under HF_HOME (~250 MB on disk
# for the "small" variant). Override TROCR_MODEL at build time to use another.
ARG TROCR_MODEL=microsoft/trocr-small-handwritten
ENV HF_HOME=/opt/hf-cache
ENV TROCR_MODEL=${TROCR_MODEL}
RUN python3 -c "import os; from transformers import TrOCRProcessor, VisionEncoderDecoderModel; m=os.environ['TROCR_MODEL']; TrOCRProcessor.from_pretrained(m); VisionEncoderDecoderModel.from_pretrained(m)"

# Listen on 8080 (the default for the aspnet:8.0 base image is already 8080,
# but we set it explicitly so it survives base-image updates).
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "CipherAnnotation.API.dll"]
