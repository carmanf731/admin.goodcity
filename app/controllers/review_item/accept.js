import Ember from 'ember';
const { getOwner } = Ember;

export default Ember.Controller.extend({

  applicationController: Ember.inject.controller('application'),
  reviewOfferController: Ember.inject.controller('review_offer'),
  reviewItem: Ember.inject.controller(),
  store: Ember.inject.service(),
  messageBox: Ember.inject.service(),
  i18n: Ember.inject.service(),
  review_item: Ember.inject.controller(),
  item: Ember.computed.alias("reviewItem.item"),
  offer: Ember.computed.alias("item.offer"),
  itemTypeId: Ember.computed.alias("reviewItem.itemTypeId"),
  isItemAccepted: Ember.computed.equal("item.state", "accepted"),
  packages: [],
  isAccepting: false,
  itemSaving: false,

  itemPackages: Ember.computed.alias("item.packages"),

  onItemPackagesChange: Ember.observer('itemPackages.[]', "itemPackages.@each.quantity", "itemPackages.@each.length", "itemPackages.@each.width", "itemPackages.@each.height", "itemPackages.@each.notes", "itemPackages.@each.packageTypeId", "itemPackages.@each.displayImageUrl", "itemPackages.@each.packageType", function () {
      this.onItemTypeChange();
      return false;
  }),

  itemType: Ember.computed('itemTypeId', function(){
    return this.get("store").peekRecord("packageType", (this.get("itemTypeId.id") || this.get("itemTypeId")));
  }),

  subPackageTypes: Ember.computed('itemType', function(){
    var itemType = this.get("itemType");
    return itemType.get("allChildPackagesList").apply(itemType).sortBy('name');
  }),

  onItemTypeChange: Ember.observer('itemTypeId', function () {
    // remove focus to hide soft-keyboard
    Ember.$("input").blur();

    if (this.get("itemSaving")) {
      return;
    }

    var itemType = this.get("itemType");
    var packages = this.get("packages");
    packages.clear();

    // load existing packages
    if (itemType && itemType.get("id") === this.get("item.packageType.id")) {
      this.get("item.packages").forEach(p => {
        var obj = p.getProperties("id", "quantity", "length", "width",
          "height", "notes", "item", "packageTypeId", "displayImageUrl",
          "packageType", "favouriteImage");
        obj.hideComment = false;
        obj.quantity = obj.quantity || 1;
        packages.pushObject(obj);
      });
    }

    // load default packages
    if (itemType && packages.length === 0) {
      itemType.get("defaultChildPackagesList").apply(itemType)
        .forEach(t => this.send("addPackage", t.get("id")));
    }
  }),

  cannotSave(){
    var pkgs = this.get('itemPackages');
    if(pkgs && pkgs.length > 0 && (pkgs.get("firstObject.hasAllPackagesDesignated") || pkgs.get("firstObject.hasAllPackagesDispatched"))){
      this.get('messageBox').alert(this.get("i18n").t('designated_dispatched_error'));
      return true;
    }
    return false;
  },

  actions: {
    clearText(index) {
      if(index !== null){
        Ember.$("#"+index).val("");
      }
    },

    addPackage(packageTypeId) {
      var _this = this;
      var note_text ="";

      this.get("packages").pushObject({
        hideComment: false,
        displayImageUrl: this.get("item.displayImageUrl"),
        notes: note_text,
        quantity: 1,
        packageTypeId,
        packageType: _this.get("store").peekRecord("packageType", packageTypeId),
        offerId: this.get("item.offer.id"),
        item: this.get("item"),
        favouriteImage: this.get("item.displayImage"),
        favouriteImageId: this.get("item.displayImage.id")
      });
    },

    setPackageImage(index, image) {
      var currentPackage = this.get("packages")[index];
      Ember.set(currentPackage, "favouriteImageId", image.get("id"));
      Ember.set(currentPackage, "displayImageUrl", image.get("thumbImageUrl"));
      this.get("packages")[index] = currentPackage;
    },

    removePackage(index) {
      this.get("packages").removeAt(index);
    },


    save() {
      if(this.get('itemPackages') && this.cannotSave()){
        return false;
      }

      // save item and packages
      // getting "Attempted to handle event *event* on *record* while in state root.deleted.saved" if try
      // to save item same time as a package is being deleted
      this.set("itemSaving", true);
      this.get('review_item').set('isEditing', false);

      var loadingView = getOwner(this).lookup('component:loading').append();

      // save packages
      var promises = [];
      var existing = {};
      var packages = this.get("packages");
      this.get("item.packages").forEach(pkg => existing[pkg.get("id")] = pkg);

      this.get("packages").forEach(data => {
        var pkg;
        data.notes = Ember.$("#comment"+packages.indexOf(data)).val();
        if (existing[data.id]) {
          pkg = existing[data.id];
          pkg.setProperties(data);
          delete existing[data.id];
        } else {
          pkg = this.store.createRecord("package", data);
        }
        pkg.set("state_event", null);
        promises.push(pkg.save());
      });

      for (var id in existing) {
        promises.push(existing[id].destroyRecord());
      }

      Ember.RSVP.all(promises)
        .then(() => {
          // save item
          var item = this.get("item");
          item.set("packageType", this.get("itemType")); // this throws error in onItemTypeChange so using itemSaving as workaround
          item.set("donorDescription", this.get("reviewItem.formData.donorDescription"));
          item.set("donorConditionId", this.get("reviewItem.formData.donorConditionId"));
          if (this.get("isAccepting")) {
            item.set("state_event", "accept");
          } else if (item.get("isDrafted")) {
            item.set("state_event", "submit");
          } else  {
            item.set("state_event", null);
          }
          item.save().finally(() => {
            this.set("itemSaving", false);
            loadingView.destroy();
            this.transitionToRoute("review_offer.items");
            this.get("reviewOfferController").set("displayCompleteReviewPopup", this.get("offer.allItemsReviewed") && this.get("offer.isUnderReview"));
          });
        });
    },

    setupAcceptClick(btnId, accept) {
      $("#" + btnId).click(() => this.set("isAccepting", accept));
    }
  }
});
