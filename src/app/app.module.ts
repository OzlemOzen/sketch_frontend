// import { NgModule } from '@angular/core';
// import { HttpClientModule } from '@angular/common/http';
// import { BrowserModule } from '@angular/platform-browser';
// import { FormsModule } from '@angular/forms';

// import { AppRoutingModule } from './app-routing.module';
// import { AppComponent } from './app.component';

// import { ModalComponent } from './shared/components/modal/modal.component';
// import { RoomFormComponent } from './features/rooms/room-form/room-form.component';
// import { SensorFormComponent } from './features/sensors/sensor-form/sensor-form.component';
// import { BuildingFormComponent } from './features/buildings/building-form/building-form.component';
// import { FloorFormComponent } from './features/floors/floor-form/floor-form.component';

// @NgModule({
//   declarations: [
//     AppComponent,
//     ModalComponent,
//     RoomFormComponent,
//     SensorFormComponent,
//     BuildingFormComponent
//   ],
//   imports: [
//     BrowserModule,
//     HttpClientModule,
//     AppRoutingModule,
//     FormsModule,
//     FloorFormComponent
//   ],
//   providers: [],
//   bootstrap: [AppComponent]
// })
// export class AppModule {}

// import { NgModule } from '@angular/core';
// import { HttpClientModule } from '@angular/common/http';
// import { BrowserModule } from '@angular/platform-browser';

// import { AppRoutingModule } from './app-routing.module';
// import { AppComponent } from './app.component';

// @NgModule({
//   declarations: [],
//   imports: [
//     BrowserModule,
//     HttpClientModule,
//     AppRoutingModule,
//     AppComponent
//   ],
//   providers: [],
//   bootstrap: [AppComponent]
// })
// export class AppModule {}

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    AppComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}