import Ember from 'ember';
import startApp from '../helpers/start-app';
import FactoryGuy from 'ember-data-factory-guy';
import TestHelper from 'ember-data-factory-guy/factory-guy-test-helper';

var App, offer, message1, message2, message3,
  message4, message5, user1, user2, offer1;

module('Reviewer: Display Offer Messages', {
  setup: function() {
    App = startApp({}, 2);
    TestHelper.setup();
    user1 = FactoryGuy.make("user");
    user2 = FactoryGuy.make("user_with_image");
    offer = FactoryGuy.make("offer", { state:"under_review"});
    offer1 = FactoryGuy.make("offer", { createdBy: user1, state:"under_review"});
    message4 = FactoryGuy.make("message", {offer: offer1, sender: user2, item: null, body: "Message from donor1", createdAt: new Date("2015/1/1")});
    message5 = FactoryGuy.make("message", {offer: offer1, sender: user1, item: null, body: "Message from donor2", createdAt: new Date("2015/1/2")});
    message1 = FactoryGuy.make("message", {offer: offer, item: null, createdAt: new Date("2015/1/3")});
    message2 = FactoryGuy.make("message", {offer: offer, item: null, body: "Message from Donor", createdAt: new Date("2015/1/4")});
    message3 = FactoryGuy.make("message", {offer: offer, item: null, body: "Message from Supervisor", isPrivate: true});
  },

  teardown: function() {
    Em.run(function() { TestHelper.teardown(); });
    Ember.run(App, 'destroy');
  }
});

test("offer-messages from donor", function() {
  visit('/offers/' + offer.id + "/donor_messages");
  andThen(function() {
    equal(currentURL(), "/offers/" + offer.id + "/donor_messages");
    equal($('.message_details').length, 2);

    var offer_message_thread_text = $('.message_details:last').parent().text();
    equal(offer_message_thread_text.indexOf(message2.get('body')) >= 0, true);
  });
});

test("offer-messages from Supervisor", function() {
  visit('/offers/' + offer.id + "/supervisor_messages");
  andThen(function() {
    equal(currentURL(), "/offers/" + offer.id + "/supervisor_messages");
    equal($('.message_details').length, 1);

    var offer_message_thread_text = $('.message_details:last').parent().text();
    equal(offer_message_thread_text.indexOf(message3.get('body')) >= 0, true);
  });
});

test("offer-messages from donor should add unread bubble in donor message tab", function() {
  visit('/offers/' + offer.id + "/supervisor_messages");
  andThen(function() {
    equal(currentURL(), "/offers/" + offer.id + "/supervisor_messages");

    FactoryGuy.make("message", {offer: offer, item: null, body: "Second Message from Donor"});

    // if message received from donor, add unread bubble mark
    equal($("a[href='/offers/"+ offer.id +"/donor_messages'] i.unread").length, 1);
  });
});

test("offer-messages from staff should add unread bubble in supervisor message tab", function() {
  visit('/offers/' + offer.id + "/donor_messages");
  andThen(function() {
    equal(currentURL(), "/offers/" + offer.id + "/donor_messages");

    FactoryGuy.make("message", {offer: offer, item: null, body: "Second Message from Supervisor", isPrivate: true});

    // if message received from donor, add unread bubble mark
    equal($("a[href='/offers/"+ offer.id +"/supervisor_messages'] i.unread").length, 1);
  });
});

test("offer-message with image", function() {
  visit('/offers/' + offer1.id + "/donor_messages");
  andThen(function() {
    var src = $(".received_message#"+message4.id+" img").attr("src");
    equal(src.indexOf("cloudinary") > 0, true);
  });
});
