import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import documentService from './documentService';
import type { Document, DocumentShare } from '../types';

const doc = { id: 'd1', title: 'Doc 1' } as unknown as Document;

describe('documentService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('getMyDocuments GETs /documents', async () => {
    mock.onGet('/documents').reply(200, [doc]);
    const res = await documentService.getMyDocuments();
    expect(res).toEqual([doc]);
  });

  it('getPublicDocuments GETs /documents/public', async () => {
    mock.onGet('/documents/public').reply(200, [doc]);
    expect(await documentService.getPublicDocuments()).toEqual([doc]);
  });

  it('getDocument GETs /documents/:id', async () => {
    mock.onGet('/documents/d1').reply(200, doc);
    expect(await documentService.getDocument('d1')).toEqual(doc);
  });

  it('createDocument POSTs multipart FormData to /documents', async () => {
    mock.onPost('/documents').reply(201, doc);
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'f.png');

    const res = await documentService.createDocument(fd);

    expect(res).toEqual(doc);
    expect(mock.history.post[0].headers?.['Content-Type']).toBe('multipart/form-data');
    expect(mock.history.post[0].data).toBeInstanceOf(FormData);
  });

  it('updateDocument PUTs to /documents/:id with body', async () => {
    mock.onPut('/documents/d1').reply(200, doc);
    const res = await documentService.updateDocument('d1', { title: 'New' });
    expect(res).toEqual(doc);
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ title: 'New' });
  });

  it('deleteDocument DELETEs /documents/:id', async () => {
    mock.onDelete('/documents/d1').reply(204);
    await documentService.deleteDocument('d1');
    expect(mock.history.delete).toHaveLength(1);
  });

  it('duplicateDocument POSTs /documents/:id/duplicate', async () => {
    mock.onPost('/documents/d1/duplicate').reply(201, doc);
    expect(await documentService.duplicateDocument('d1')).toEqual(doc);
  });

  it('shareDocument POSTs email + permission', async () => {
    const share = { id: 's1' } as unknown as DocumentShare;
    mock.onPost('/documents/d1/share').reply(200, share);

    const res = await documentService.shareDocument('d1', 'a@b.c', 'Editor' as never);

    expect(res).toEqual(share);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      userEmail: 'a@b.c',
      permission: 'Editor',
    });
  });

  it('removeShare DELETEs /documents/:docId/share/:shareId', async () => {
    mock.onDelete('/documents/d1/share/s1').reply(204);
    await documentService.removeShare('d1', 's1');
    expect(mock.history.delete[0].url).toBe('/documents/d1/share/s1');
  });

  it('getShares GETs /documents/:docId/shares', async () => {
    const shares = [{ id: 's1' }] as unknown as DocumentShare[];
    mock.onGet('/documents/d1/shares').reply(200, shares);
    expect(await documentService.getShares('d1')).toEqual(shares);
  });

  it('propagates request errors', async () => {
    mock.onGet('/documents').reply(500);
    await expect(documentService.getMyDocuments()).rejects.toBeDefined();
  });
});
