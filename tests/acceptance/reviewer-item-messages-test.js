import Ember from 'ember';
import startApp from '../helpers/start-app';
import FactoryGuy from 'ember-data-factory-guy';
import TestHelper from 'ember-data-factory-guy/factory-guy-test-helper';
import { module, test } from 'qunit';
import '../factories/message';
import '../factories/offer';
import '../factories/item';
import '../factories/role';

var App, offer, item, message1, message2, message3, role;

module('Reviewer: Display Item Messages', {
  beforeEach: function() {
    App = startApp({}, 2);
    TestHelper.setup();
    role = FactoryGuy.make("role");
    $.mockjax({url: '/api/v1/role*', type: 'GET', status: 200,responseText: {
      roles: [role.toJSON({includeId: true})]
      }
    });
    offer = FactoryGuy.make("offer", { state:"under_review"});
    item = FactoryGuy.make("item", { state:"submitted", offer: offer});
    message1 = FactoryGuy.make("message", { offer: offer, item: item, createdAt: new Date("2015/1/1")});
    message2 = FactoryGuy.make("message", { offer: offer, item: item, body: "Message from Donor", createdAt: new Date("2015/1/2")});
    message3 = FactoryGuy.make("message", { offer: offer, item: item, body: "Message from Supervisor", isPrivate: true});
  },

  afterEach: function() {
    Em.run(function() { TestHelper.teardown(); });
    Ember.run(App, 'destroy');
  }
});

test("item-messages from donor", function(assert) {
  assert.expect(3);
  visit('/offers/' + offer.id + "/review_item/" + item.id + "/donor_messages");
  andThen(function() {
    assert.equal(currentURL(), "/offers/" + offer.id + "/review_item/" + item.id + "/donor_messages");
    assert.equal($('.message_details').length, 2);

    var offer_message_thread_text = $('.message_details:last').parent().text();
    assert.equal(offer_message_thread_text.indexOf(message2.get('body')) >= 0, true);
  });
});

test("item-messages from Supervisor", function(assert) {
  assert.expect(3);
  visit('/offers/' + offer.id + "/review_item/" + item.id + "/supervisor_messages");
  andThen(function() {
    assert.equal(currentURL(), "/offers/" + offer.id + "/review_item/" + item.id + "/supervisor_messages");
    assert.equal($('.message_details').length, 1);

    var offer_message_thread_text = $('.message_details:last').parent().text();
    assert.equal(offer_message_thread_text.indexOf(message3.get('body')) >= 0, true);
  });
});

test("item-messages from donor should add unread bubble in donor message tab", function(assert) {
  assert.expect(2);
  visit('/offers/' + offer.id + "/review_item/" + item.id + "/supervisor_messages");
  andThen(function() {
    assert.equal(currentURL(), "/offers/" + offer.id + "/review_item/" + item.id + "/supervisor_messages");

    FactoryGuy.make("message", { offer: offer, item: item, body: "Second Message from Donor"});

    // if message received from donor, add unread bubble mark
    assert.equal($("a[href='/offers/"+ offer.id +"/review_item/"+ item.id +"/donor_messages'] i.unread").length, 1);
  });
});

test("offer-messages from staff should add unread bubble in supervisor message tab", function(assert) {
  assert.expect(2);
  visit('/offers/' + offer.id + "/review_item/" + item.id + "/donor_messages");
  andThen(function() {
    assert.equal(currentURL(), "/offers/" + offer.id + "/review_item/" + item.id + "/donor_messages");

    FactoryGuy.make("message", { offer: offer, item: item, body: "Second Message from Supervisor", isPrivate: true});

    // if message received from donor, add unread bubble mark
    assert.equal($("a[href='/offers/"+ offer.id +"/review_item/"+ item.id +"/supervisor_messages'] i.unread").length, 1);
  });
});
