import { expect } from 'chai';
import models from '../server/models';
import * as utils from '../test/utils';

const { LegalDocument, User, Collective } = models;

describe('LegalDocument model', () => {
  // globals to be set in the before hooks.
  let hostCollective, user, userCollective;

  const documentData = {
    year: 2019,
  };

  const userData = {
    username: 'xdamman',
    email: 'xdamman@opencollective.com',
  };

  const hostCollectiveData = {
    slug: 'myhost',
    name: 'myhost',
    currency: 'USD',
    tags: ['#brusselstogether'],
    tiers: [
      {
        name: 'backer',
        range: [2, 100],
        interval: 'monthly',
      },
      {
        name: 'sponsor',
        range: [100, 100000],
        interval: 'yearly',
      },
    ],
  };

  beforeEach(() => utils.resetTestDB());
  beforeEach(async () => {
    hostCollective = await Collective.create(hostCollectiveData);
    user = await User.createUserWithCollective(userData);
    userCollective = await models.Collective.findByPk(user.CollectiveId);
  });

  it('it can set and save a new document_link', async () => {
    const expected = 'a string';
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    doc.documentLink = expected;
    await doc.save();
    await doc.reload();

    expect(doc.documentLink).to.eq(expected);
  });

  // I think this is the correct behaviour. We have to keep tax records for 7 years. Maybe this clashes with GDPR? For now it's only on the Open Source Collective which is US based. So I _think_ it's ok.
  // This assumes collectives will never be force deleted. If they are then the Legal Document model will fail its foreign key constraint when you try and load it.
  it('it will not be deleted if the host collective is soft deleted', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);
    expect(doc.deletedAt).to.eq(null);

    await hostCollective.destroy();

    // This would fail if the doc was deleted
    expect(doc.reload()).to.be.fulfilled;
  });

  // See comment above
  it('it will not be deleted if the user collective is soft deleted', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);
    expect(doc.deletedAt).to.eq(null);

    await userCollective.destroy();

    // This would fail if the doc was deleted
    expect(doc.reload()).to.be.fulfilled;
  });

  it('it can be deleted without deleting the collectives it belongs to', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);
    await doc.destroy();

    await hostCollective.reload();
    await userCollective.reload();

    expect(hostCollective.id).to.not.eq(null);
    expect(userCollective.id).to.not.eq(null);
  });

  it('can set and save a valid new request status', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    expect(doc.requestStatus).to.eq(LegalDocument.requestStatus.NOT_REQUESTED);

    doc.requestStatus = LegalDocument.requestStatus.RECEIVED;
    await doc.save();
    await doc.reload();

    expect(doc.requestStatus).to.eq(LegalDocument.requestStatus.RECEIVED);
  });

  it('it will fail if attempting to set an invalid request status', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    expect(doc.requestStatus).to.eq(LegalDocument.requestStatus.NOT_REQUESTED);

    doc.requestStatus = 'SCUTTLEBUTT';
    expect(doc.save()).to.be.rejected;
  });

  it('it can be found via its host collective', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    const retrievedDocs = await hostCollective.getHostedLegalDocuments();

    expect(retrievedDocs[0].id).to.eq(doc.id);
  });

  it('it can be found via its collective', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    const retrievedDocs = await userCollective.getLegalDocuments();

    expect(retrievedDocs[0].id).to.eq(doc.id);
  });

  it('it can get its associated collective', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    const retrievedCollective = await doc.getCollective();

    expect(retrievedCollective.id).to.eq(userCollective.id);
  });

  it('it can get its associated host collective', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);

    const retrievedHost = await doc.getHostCollective();

    expect(retrievedHost.id).to.eq(hostCollective.id);
  });

  it("it can't be created if the year is less than 2015", async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    legalDoc.year = 2014;
    expect(models.LegalDocument.create(legalDoc)).to.be.rejected;
  });

  it("it can't be created if the year is null", async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    delete legalDoc.year;
    expect(models.LegalDocument.create(legalDoc)).to.be.rejected;
  });

  it("it can't be created if the HostCollectiveId is null", async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: null,
      CollectiveId: userCollective.id,
    });
    expect(models.LegalDocument.create(legalDoc)).to.be.rejected;
  });

  it("it can't be created if the CollectiveId is null", async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: null,
    });
    expect(models.LegalDocument.create(legalDoc)).to.be.rejected;
  });

  it('can be created and has expected values', async () => {
    const legalDoc = Object.assign({}, documentData, {
      HostCollectiveId: hostCollective.id,
      CollectiveId: userCollective.id,
    });
    const doc = await models.LegalDocument.create(legalDoc);
    expect(doc.requestStatus).to.eq(LegalDocument.requestStatus.NOT_REQUESTED);
    expect(doc.documentType).to.eq(LegalDocument.documentType.US_TAX_FORM);
  });
});
