'use strict';

var credentials = 123;
var jstag = {
    send: function (data) {}
};

pathfora.utils.saveCookie('seerid', 123);


describe("Pathfora", function () {
    beforeEach(function() {
        localStorage.clear();
        pathfora.clearAll();
    });

    it("should track current time spent on page with 1 second accuracy", function () {
        jasmine.clock().install();

        pathfora.initializeWidgets([], credentials);

        var initialTime = pathfora.getData().timeSpentOnPage;

        jasmine.clock().tick(10000);

        var afterDelay = pathfora.getData().timeSpentOnPage;

        expect(afterDelay).toBeGreaterThan(initialTime + 8);
        expect(afterDelay).toBeLessThan(initialTime + 12);

        jasmine.clock().uninstall();
    });

    it("should distinguish newcomers, subscribers and common users", function (done) {
        jasmine.Ajax.install();
        var messageA = pathfora.Message({
            id: "test-bar-01",
            msg: "A",
            layout: "modal"
        });

        var messageB = pathfora.Message({
            id: "test-bar-02",
            msg: "B",
            layout: "modal"
        });

        var messageC = pathfora.Message({
            id: "test-bar-03",
            msg: "C",
            layout: "modal"
        });

        var widgets = {
            target: [{
                segment: 'a',
                widgets: [messageA]
            },{
                segment: 'b',
                widgets: [messageB]
            },{
                segment: 'c',
                widgets: [messageC]
            }]
        };

        pathfora.initializeWidgets(widgets, credentials);

        expect(jasmine.Ajax.requests.mostRecent().url).toBe('https://api.lytics.io/api/me/123/123?segments=true');

        jasmine.Ajax.requests.mostRecent().respondWith({
            "status": 200,
            "contentType": 'application/json',
            "responseText": '{"data":{"segments":["all","b"]}}'
        });

        var widget = $('#' + messageB.id);
        expect(widget).toBeDefined();

        var notOpenedA = $('#' + messageA.id);
        var notOpenedC = $('#' + messageC.id);

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();
            expect(notOpenedA.length).toBe(0);
            expect(notOpenedC.length).toBe(0);

            var msg = $('.pf-widget-message').text();
            expect(msg).toBe('B');

            pathfora.clearAll();
            done();
        }, 200);

        jasmine.Ajax.uninstall();
    });

    it("should know if users shown interest in past", function () {
        localStorage.clear();
        var messageBar = pathfora.Message({
            layout: "bar",
            msg: "Message bar  - interest test",
            confirmAction: {
                name: "Test confirm action",
                callback: function() {console.log("test confirmation")}
            }
        });
        var messageModal = pathfora.Message({
            layout: "modal",
            msg: "Message modal - interest test"
        });
        pathfora.initializeWidgets([messageBar, messageModal], credentials);

        var completedActions = pathfora.getData().completedActions.length;
        var closedWidgets = pathfora.getData().closedWidgets.length;
        expect(completedActions).toBe(0);
        expect(closedWidgets).toBe(0);

        $('#' + messageBar.id).find('.pf-widget-ok').click();
        $('#' + messageModal.id).find('.pf-widget-close').click();

        completedActions = pathfora.getData().completedActions.length;
        closedWidgets = pathfora.getData().closedWidgets.length;
        console.log(pathfora.getData());
        expect(completedActions).toBe(1);
        expect(closedWidgets).toBe(1);
    });

    it("should report displaying widgets and it's variants", function () {
        jasmine.Ajax.install();

        var messageBar = pathfora.Message({
            layout: "modal",
            msg: "Message bar - reporting test",
            id: "modal-display-report"
        });

        spyOn(jstag, 'send');

        pathfora.initializeWidgets([messageBar], credentials);

        expect(jstag.send).toHaveBeenCalledWith(jasmine.objectContaining({
            "pf-widget-id": messageBar.id,
            "pf-widget-type": "message",
            "pf-widget-layout": "modal",
            "pf-widget-variant": '1',
            "pf-widget-event": "show"
        }));

        pathfora.clearAll();
        jasmine.Ajax.uninstall();
    });

    it("should report closing widgets and it's variants", function () {
        jasmine.Ajax.install();
        jasmine.clock().install();

        var messageBar = pathfora.Message({
            layout: "modal",
            msg: "Message bar - close reporting",
            id: "bar-close-report"
        });

        pathfora.initializeWidgets([messageBar], credentials);

        spyOn(jstag, 'send');
        $('.pf-widget-close').click();

        jasmine.clock().tick(1000);

        expect(jstag.send).toHaveBeenCalledWith(jasmine.objectContaining({
            "pf-widget-id": messageBar.id,
            "pf-widget-type": "message",
            "pf-widget-layout": "modal",
            "pf-widget-variant": '1',
            "pf-widget-event": "close"
        }));

        pathfora.clearAll();
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
    });

    it("should report completed actions to Lytics API", function (done) {
        jasmine.Ajax.install();

        var messageBar = pathfora.Message({
            layout: "modal",
            msg: "Message modal - action report test",
            confirmAction: {
                name: "action test",
                callback: function() {console.log("test confirmation")}
            }
        });

        pathfora.initializeWidgets([messageBar], credentials);

        var widget = $('#' + messageBar.id);

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();

            spyOn(jstag, 'send');

            expect(jstag.send).not.toHaveBeenCalled();

            widget.find('.pf-widget-ok').click();
            expect(jstag.send).toHaveBeenCalled();

            expect(jstag.send).toHaveBeenCalledWith(jasmine.objectContaining({
                "pf-widget-action": "action test"
            }));

            jasmine.Ajax.uninstall();
            done();
        }, 200);
    });

    it("should report submitting forms, with form data", function () {
        jasmine.Ajax.install();

        var messageBar = pathfora.Message({
            layout: "modal",
            msg: "Message modal - form submit reports",
            id: "ABCa"
        });

        pathfora.initializeWidgets([messageBar], credentials);


        spyOn(jstag, 'send');
        console.log( $('.pf-widget-close'));
        $('.pf-widget-close').click();

        expect(jstag.send).toHaveBeenCalledWith(jasmine.objectContaining({
            "pf-widget-id": messageBar.id,
            "pf-widget-type": "message",
            "pf-widget-layout": "modal",
            "pf-widget-variant": '1',
            "pf-widget-event": "close"
        }));

        jasmine.Ajax.uninstall();
    });


    it("should use specified global config for all widgets", function () {
        var messageBar = pathfora.Message({
            position: "top",
            msg: "test"
        });
        var config = {
            generic: {
                theme: 'light'
            }
        };

        pathfora.initializeWidgets([messageBar], credentials, config);

        expect($('#' + messageBar.id).hasClass('pf-theme-default')).toBe(false);
        expect($('#' + messageBar.id).hasClass('pf-theme-light')).toBe(true);
    });


    it("should be able to clear all widgets and handlers", function (done) {
        var clearDataObject = {
            pageViews: 0,
            timeSpentOnPage: 0,
            closedWidgets: [],
            completedActions: [],
            displayedWidgets: []
        };

        var form = new pathfora.Subscription({
            msg: 'test',
            layout: 'modal'
        });

        pathfora.initializeWidgets([form], credentials);
        var widget = $('#' + form.id);

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();
            expect(pathfora.getData()).not.toEqual(clearDataObject);

            pathfora.clearAll();

            expect(widget.hasClass('opened')).toBeFalsy();
            expect(pathfora.getData()).toEqual(clearDataObject);

            done();
        }, 200);
    });

    it("should not allow to register 2 widgets with the same id", function () {
        var w1 = new pathfora.Message({
            msg: 'Duplicate id test1',
            layout: "modal",
            id: 'asd'
        });

        var w2 = new pathfora.Form({
            msg: 'Duplcate id test2',
            layout: 'slideout',
            id: 'asd'
        });

        expect(function() {
            pathfora.initializeWidgets([w1, w2], credentials);
        }).toThrow(new Error('Cannot add two widgets with the same id'));
    });

    xit("should be able to display widget only on specific page scrolling value", function (done) {
        $(document.body).append("<div id=\"height-element\" style=\"height:10000px\">Test</div>");

        var form = new pathfora.Subscription({
            msg: 'test',
            layout: 'modal',
            displayConditions: {
                scrollPercentageToDisplay: 20
            }
        });

        pathfora.initializeWidgets([form], credentials);
        var widget = $('#' + form.id);

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeFalsy();

            var height = $(document).height();
            $('body').scrollTop(height/2);

            setTimeout(function() {
                expect(widget.hasClass('opened')).toBeTruthy();
                done();
            }, 200);

        }, 200);

        $('.height-element').remove();
    });

    xit("should be able to display widget only if user can see specific DOM element", function () {
        throw 'pass'
    });

    // abandonend
    xit("should keep data in stats data in localstorage", function () {
    });

    xit("should properly update existing localstorage data", function () {
    });

    xit("should use localstorage object for updating completed actions", function() {
        localStorage.setItem('pathforaData', JSON.stringify({completed:5, closed : 5}));
        var messageBar = pathfora.Message({
            layout: "modal",
            msg: "Welcome to our website",
            confirmAction: {
                name: "Test confirm action",
                callback: function() {console.log("test confirmation")}
            }
        });
        pathfora.initializeWidgets([messageBar], credentials);

        var completedActions = pathfora.getData().completedActions.length;
        var closedWidgets = pathfora.getData().closedWidgets;
        expect(completedActions).toBe(5);
        expect(closedWidgets).toBe(5);

        $(messageBar.element).find('.pf-widget-ok').click();
        $(messageBar.element).find('.pf-widget-close').click();
        completedActions = pathfora.getData().completedActions.length;
        closedWidgets = pathfora.getData().closedWidgets;
        expect(completedActions).toBe(6);
        expect(closedWidgets).toBe(6);
    });

    xit("should keep number of page visits for later use", function () {
        var messageBar = pathfora.Message({
            position: "bottom-fixed",
            msg: "hello new user"
        });

        // new user
        localStorage.clear();
        pathfora.initializeWidgets([messageBar], credentials);

        var VisitedPage = pathfora.getData().pageViews;
        pathfora.clearAll();

        expect(VisitedPage).toBe(1);

        pathfora.initializeWidgets([messageBar], credentials);

        VisitedPage = pathfora.getData().pageViews;
        pathfora.clearAll();

        expect(VisitedPage).toBe(2);
    });
});


describe("Widgets", function () {
    beforeEach(function() {
        localStorage.clear();
        pathfora.clearAll();
    });

    it("should be able to be displayed on document", function (done) {

        var promoWidget = new pathfora.Message({
            layout: "bar",
            msg: "Opening widget",
            id: "widget-1"
        });
        pathfora.initializeWidgets([promoWidget], credentials);

        // should append element to DOM
        var widget = $('#' + promoWidget.id);
        expect(widget).toBeDefined();

        // should have class 'opened' after while
        pathfora.showWidget(promoWidget);

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();
            pathfora.clearAll();
            done();
        }, 200);

    });

    it("should have proper id when specified, and unique id otherwise", function (done) {
        var w1 = new pathfora.Message({
            layout: "slideout",
            position: 'right',
            msg: "Welcome to our test website",
            id: "test-id-widget"
        });

        var w2 = new pathfora.Message({
            layout: "slideout",
            position: 'left',
            msg: "Welcome to our test website"
        });

        pathfora.initializeWidgets([w1, w2], credentials);

        setTimeout(function() {
            var right = $('.pf-widget.pf-position-right');
            var left = $('.pf-widget.pf-position-left');

            expect(right).toBeDefined();
            expect(left).toBeDefined();

            expect(left.attr('id')).toBeDefined();
            expect(left.attr('id').length).toBeGreaterThan(10);
            expect(right.attr('id')).toBe('test-id-widget');
            done();
        }, 200);
    });

    it("should be able to be displayed on document", function (done) {

        var promoWidget = new pathfora.Message({
            layout: "bar",
            msg: "Opening widget",
            id: "widget-1"
        });
        pathfora.initializeWidgets([promoWidget], credentials);

        // should append element to DOM
        var widget = $('#' + promoWidget.id);
        expect(widget).toBeDefined();

        // should have class 'opened' after while
        pathfora.showWidget(promoWidget);

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();
            pathfora.clearAll();
            done();
        }, 200);

    });

    it("should not append widget second time if it's already opened", function (done) {
        var openedWidget = new pathfora.Message({
            layout: 'modal',
            msg: "test widget"
        });
        pathfora.initializeWidgets([openedWidget], credentials);

        var widget = $('#' + openedWidget.id);

        // timeouts gives some time for appending to DOM
        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();

            pathfora.showWidget(openedWidget);

            setTimeout(function() {
                expect($('.pf-widget').length).toEqual(1);
                pathfora.clearAll();
                done();
            }, 200);
        }, 500);
    });

    it("should be able to close", function (done) {
        var promoWidget = new pathfora.Message({
            layout: "modal",
            msg: "Close widget test",
            id: "close-widget"
        });
        pathfora.initializeWidgets([promoWidget], credentials);
        pathfora.showWidget(promoWidget);

        var widget = $("#" + promoWidget.id);
        expect(widget).toBeDefined();

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();
            widget.find(".pf-widget-close").click();
            expect(widget.hasClass('opened')).toBeFalsy();
            done();
        }, 200);
    });

    it("should not be in DOM when closed", function (done) {
        var testWidget = new pathfora.Message({
            layout: "modal",
            msg: "Close widget test",
            id: "close-clear-widget"
        });

        pathfora.initializeWidgets([testWidget], credentials);
        pathfora.showWidget(testWidget);

        var widget = $("#" + testWidget.id);
        expect(widget).toBeDefined();

        setTimeout(function() {
            expect(widget.hasClass('opened')).toBeTruthy();
            expect( widget[0]).toBeDefined();

            widget.find(".pf-widget-close").click();

            setTimeout(function () {
                expect( $("#" + testWidget.id)[0]).toBeUndefined();
                done();
            }, 600)

        }, 200);
    });

    it("should have correct theme configuration", function () {
        var w1 = new pathfora.Message({
            layout: 'button',
            position: 'left',
            msg: 'light button',
            id: 'light-widget',
            theme: 'light'
        });

        var w2 = new pathfora.Message({
            layout: 'button',
            position: 'right',
            msg: 'dark button',
            id: 'dark-widget',
            theme: 'dark'
        });

        var w3 = new pathfora.Message({
            layout: 'button',
            position: 'top-left',
            msg: 'custom color button',
            id: 'custom-widget',
            theme: 'custom',
            colors: {
                background: "#fff"
            }
        });

        var w4 = new pathfora.Message({
            layout: 'button',
            position: 'top-right',
            msg: 'default button',
            id: 'def-theme-widget'
        });

        pathfora.initializeWidgets([w1,w2,w3, w4], credentials);

        var light = $("#" + w1.id);
        var dark = $("#" + w2.id);
        var custom = $("#" + w3.id);
        var def = $("#" + w4.id);

        expect(light.hasClass('pf-theme-light')).toBeTruthy();
        expect(dark.hasClass('pf-theme-dark')).toBeTruthy();
        expect(custom.hasClass('pf-theme-custom')).toBeTruthy();
        expect(def.hasClass('pf-theme-default')).toBeTruthy();

        expect(custom.css('background-color')).toBe('rgb(255, 255, 255)');
    });

    it("can be hidden on initialization", function () {
        var openedWidget = new pathfora.Message({
            layout: "modal",
            msg: "Displayed on init",
            id: "displayed-on-init"
        });

        var closedWidget = new pathfora.Message({
            layout: "modal",
            msg: "Hidden on init",
            id: "hidden-on-init",
            displayConditions: {
                showOnInit: false
            }
        });

        pathfora.initializeWidgets([openedWidget, closedWidget], credentials);

        expect( $("#" + openedWidget.id)[0]).toBeDefined();
        expect( $("#" + closedWidget.id)[0]).toBeUndefined();

    });

    it("should be able to configure style of each widget element", function () {
        var modal = pathfora.Message({
            id: "custom-style-test",
            layout: "modal",
            msg: "Custom style test",
            header: "Hello",
            colors: {
                background: '#eee',
                header: "#333",
                text: "#333",
                close: "#888",
                actionText: "#ddd",
                actionBackground: "#111",
                cancelText: "#333",
                cancelBackground: "#eee"
            }
        });

        pathfora.initializeWidgets([modal], credentials);

        var background = $('#' + modal.id).find(".pf-widget-content");
        var header = $('#' + modal.id).find(".pf-widget-header");
        var text = $('#' + modal.id).find(".pf-widget-message");
        var closeBtn = $('#' + modal.id).find(".pf-widget-close");
        var actionBtn = $('#' + modal.id).find(".pf-widget-ok");
        var cancelBtn = $('#' + modal.id).find(".pf-widget-cancel");

        expect(background.css('background-color')).toBe('rgb(238, 238, 238)');
        expect(header.css('color')).toBe('rgb(51, 51, 51)');
        expect(text.css('color')).toBe('rgb(51, 51, 51)');
        expect(closeBtn.css('color')).toBe('rgb(136, 136, 136)');
        expect(actionBtn.css('color')).toBe('rgb(221, 221, 221)');
        expect(actionBtn.css('background-color')).toBe('rgb(17, 17, 17)');
        expect(cancelBtn.css('color')).toBe('rgb(51, 51, 51)');
        expect(cancelBtn.css('background-color')).toBe('rgb(238, 238, 238)');
    });

    it("should be able to show after specified time", function () {
        jasmine.clock().install();
        var delayedWidget = new pathfora.Message({
            msg: 'Delayed widget test',
            id: 'delayed-widget',
            layout: 'modal',
            displayConditions: {
                showDelay: 2
            }
        });

        pathfora.initializeWidgets([delayedWidget], credentials);
        var widget = $('#' + delayedWidget.id);

        jasmine.clock().tick(1000);
        expect(widget[0]).toBeUndefined();

        jasmine.clock().tick(2000);
        expect($('#' + delayedWidget.id)[0]).toBeDefined();

        jasmine.clock().uninstall();
    });

    it("should trigger callback function after pressing action button", function () {
        var promoWidget = new pathfora.Message({
            layout: "modal",
            msg: "Welcome to our website",
            id: "promo-widget"
        });
        pathfora.initializeWidgets([promoWidget], credentials);

        var hiddenClass = $("#promo-widget").hasClass("testNameClass");
        expect(hiddenClass).toBe(true);
    });

    // Future functionalities
    xit("should be able to show after specific number of visits", function () {
        throw 'pass';
    });

    xit("should be able to randomly choose one of available variations", function () {
        throw 'pass';
    });
});


describe("Message Widget", function () {

    afterEach(function() {
        localStorage.clear();
        pathfora.clearAll();
    });

    it("should not allow to be initialized without default properties", function () {
        var missingParams = function () {
            var promoWidget = new pathfora.Message();
            pathfora.initializeWidgets([promoWidget], credentials);
        };
        var missingMessage = function () {
            var promoWidget = new pathfora.Message({layout: "modal"});
            pathfora.initializeWidgets([promoWidget], credentials);
        };
        var missingLayout = function () {
            var promoWidget = new pathfora.Message({message: "Welcome to our website"});
            pathfora.initializeWidgets([promoWidget], credentials);
        };
        expect(missingParams).toThrowError("Config object is missing");
        pathfora.clearAll();

        expect(missingMessage).toThrowError("Config object is missing");
        pathfora.clearAll();

        expect(missingLayout).toThrowError("Config object is missing");
    });

    xit("should display in proper website regions", function () {

    });

    xit("should allow custom messages on action buttons", function () {

    });

});

describe("API", function () {
    beforeEach(function () {
        jasmine.Ajax.install();
    });
    afterEach(function () {
        jasmine.Ajax.uninstall();
    });

    it("should be able call API with credentials", function () {
        var callback = jasmine.createSpy("success");
        var credentials = {accountId: 'abc123', userId: '123'};
        var subscribe = new pathfora.Subscription({
            type: "bar",
            variant: "floating",
            msg: "Signup to get updates right into your inbox"
        });
        pathfora.initializeWidgets([subscribe], credentials);
        pathfora.api.getWidgetData(subscribe, callback);

        expect(callback).not.toHaveBeenCalled();
        jasmine.Ajax.requests.mostRecent().respondWith({
            "status": 200,
            "contentType": 'text/plain',
            "responseText": '{"response":"ok"}'
        });

        expect(callback).toHaveBeenCalledWith('{"response":"ok"}');
    });

    it("should get data from API and pass it to callback function", function () {
        var callback = jasmine.createSpy("success");
        var credentials = {accountId: 'abc123', userId: '123'};
        var subscribe = new pathfora.Subscription({
            type: "bar",
            variant: "floating",
            msg: "Signup to get updates right into your inbox"
        });
        pathfora.initializeWidgets([subscribe], credentials);
        pathfora.api.getWidgetData(subscribe, callback);

        expect(callback).not.toHaveBeenCalled();
        jasmine.Ajax.requests.mostRecent().respondWith({
            "status": 200,
            "contentType": 'text/plain',
            "responseText": '{"response":"ok"}'
        });

        expect(callback).toHaveBeenCalledWith('{"response":"ok"}');
    });

    it("should properly handle errors by running onError function", function () {
        var callback = jasmine.createSpy("success");

        var credentials = {accountId: 'abc123', userId: '123'};
        var subscribe = new pathfora.Subscription({
            type: "bar",
            variant: "floating",
            msg: "Signup to get updates right into your inbox"
        });
        var widgets = pathfora.initializeWidgets([subscribe], credentials);
        pathfora.api.getWidgetData(subscribe, function () {
        }, callback);

        expect(callback).not.toHaveBeenCalled();
        jasmine.Ajax.requests.mostRecent().respondWith({
            "status": 401,
            "contentType": 'text/plain',
            "responseText": '{"response":"error"}'
        });

        expect(callback).toHaveBeenCalledWith('{"response":"error"}');
    });

});