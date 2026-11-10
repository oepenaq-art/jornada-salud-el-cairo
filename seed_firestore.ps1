$apiKey = "AIzaSyA059i9CScKI6TP5NSipD02UfLRJRxnXao"
$projectId = "jornada-salud-el-cairo"
$baseUrl = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents"

Write-Host "Iniciando carga de Medicos a Firebase Firestore..."

$medicos = @(
  @{ id="doc-ped-01"; nombre="Dra. Catalina Romero Serna"; cc="31429578"; especialidad="Pediatría"; lugar="Colegio La Presentación"; tel="3206938944" },
  @{ id="doc-ped-02"; nombre="Dra. Edna Karina Garcia Ramirez"; cc="1130611541"; especialidad="Pediatría"; lugar="Colegio La Presentación"; tel="3007775283" },
  @{ id="doc-ped-03"; nombre="Dr. Gabriel Lopez"; cc="74184732"; especialidad="Pediatría"; lugar="Colegio La Presentación / Albán"; tel="3173625557" },
  @{ id="doc-ped-04"; nombre="Dr. Gustavo Duque"; cc="1112782156"; especialidad="Pediatría"; lugar="Colegio La Presentación"; tel="3226805510" },
  @{ id="doc-ped-05"; nombre="Dr. Oscar Enrique Peña Quemba"; cc="80926082"; especialidad="Pediatría"; lugar="Colegio La Presentación / Hospital"; tel="3006124216" },
  @{ id="doc-ped-06"; nombre="Dra. Beatriz Ospina"; cc="43586701"; especialidad="Pediatría"; lugar="Colegio La Presentación / Resguardo La Guajira"; tel="3104348554" },
  @{ id="doc-ped-07"; nombre="Dra. Martha Cuellar"; cc="43978320"; especialidad="Pediatría (Neumología)"; lugar="Colegio La Presentación"; tel="" },
  @{ id="doc-ped-08"; nombre="Dra. Juliana Trujillo Gómez"; cc="32295717"; especialidad="Pediatría (Neurología)"; lugar="Colegio La Presentación"; tel="3128690217" },
  @{ id="doc-ped-09"; nombre="Dr. Daniel Madrid Gómez"; cc="1017241043"; especialidad="Pediatría (Residente)"; lugar="Colegio La Presentación / Resguardo"; tel="3104483199" },
  @{ id="doc-ped-10"; nombre="Dra. Laura Barrientos"; cc="1039464063"; especialidad="Pediatría (Residente)"; lugar="Colegio La Presentación / Resguardo"; tel="3182064728" },
  @{ id="doc-ped-11"; nombre="Dr. David Andrés Espinal Botero"; cc="70554260"; especialidad="Pediatría"; lugar="Colegio La Presentación"; tel="3104422144" },
  @{ id="doc-ped-12"; nombre="Dra. Maria Gabriela Novoa Villada"; cc="1152210382"; especialidad="Pediatría"; lugar="Colegio La Presentación"; tel="3225393210" },
  @{ id="doc-ped-13"; nombre="Dra. Manuela Rendón Díez"; cc="1037637056"; especialidad="Pediatría"; lugar="Colegio La Presentación"; tel="" },
  @{ id="doc-med-01"; nombre="Dra. Isabella Alzate Arias"; cc="1144106068"; especialidad="Medicina General"; lugar="Hospital Santa Catalina"; tel="3166179851" },
  @{ id="doc-med-02"; nombre="Dra. Sara Hernandez"; cc="1113670304"; especialidad="Medicina General"; lugar="Hospital Santa Catalina"; tel="3004561485" },
  @{ id="doc-med-03"; nombre="Dra. Juanita Greiffenstein"; cc="1000413109"; especialidad="Medicina General (Interna)"; lugar="Hospital / Colegio / Albán"; tel="3006027810" },
  @{ id="doc-med-04"; nombre="Dr. Nicolas Ugarte Diaz"; cc="1125288462"; especialidad="Medicina General (Interno)"; lugar="Hospital / Colegio / Albán"; tel="3008142171" },
  @{ id="doc-med-05"; nombre="Dra. Laura Michelle Durán Burgos"; cc="1007917724"; especialidad="Medicina General (Interna Mayor)"; lugar="Hospital Santa Catalina"; tel="3184937142" },
  @{ id="doc-derm-01"; nombre="Dra. Silvana Castillo"; cc="1112878579"; especialidad="Dermatología"; lugar="Hospital Santa Catalina"; tel="3173764943" },
  @{ id="doc-derm-02"; nombre="Dr. David Chalarca"; cc="1036679311"; especialidad="Dermatología"; lugar="Hospital Santa Catalina"; tel="" },
  @{ id="doc-uro-01"; nombre="Dra. Julianna Santoyo Vargas"; cc="29111847"; especialidad="Urología"; lugar="Hospital Santa Catalina"; tel="3217101649" },
  @{ id="doc-opt-01"; nombre="Dra. Andrea Stephany Rojas Castro"; cc="1088329721"; especialidad="Optometría"; lugar="Colegio La Presentación"; tel="3186968096" },
  @{ id="doc-odo-01"; nombre="Dra. Lizeth Daniela Quintero"; cc="1112905289"; especialidad="Odontología"; lugar="Hospital Santa Catalina"; tel="3148649745" },
  @{ id="doc-odo-02"; nombre="Dra. Laura Milena Duque Restrepo"; cc="1053812026"; especialidad="Odontología"; lugar="Hospital Santa Catalina"; tel="3241242424" },
  @{ id="doc-fisio-01"; nombre="Dra. Maria Alejandra Arroyave Mondragón"; cc="1112904259"; especialidad="Fisioterapia"; lugar="Casa de la Cultura"; tel="3117302737" },
  @{ id="doc-fisio-02"; nombre="Dr. Fernando Jordan Castro"; cc="76143050"; especialidad="Fisioterapia"; lugar="Casa de la Cultura"; tel="3146789821" },
  @{ id="doc-enf-01"; nombre="Enf. Eliana Garcia Valencia"; cc="1112905072"; especialidad="Enfermería (Heridas)"; lugar="Casa de la Cultura / Hospital"; tel="3128201567" },
  @{ id="doc-enf-02"; nombre="Enf. Gina Paola Barco Ocampo"; cc="1112904568"; especialidad="Enfermería"; lugar="Hospital Santa Catalina"; tel="3136280039" },
  @{ id="doc-enf-03"; nombre="Enf. Giovana Gallego Narváez"; cc="42143097"; especialidad="Enfermería"; lugar="Hospital Santa Catalina"; tel="3113456332" },
  @{ id="doc-enf-04"; nombre="Enf. Kevin Parra Salinas"; cc="1112906295"; especialidad="Enfermería"; lugar="Hospital / Colegio"; tel="3113398071" }
)

foreach ($m in $medicos) {
  $docId = $m.id
  $urlDoc = "$baseUrl/jornada_el_cairo_medicos/$docId`?key=$apiKey"
  $body = @{
    fields = @{
      id = @{ stringValue = $m.id }
      nombre = @{ stringValue = $m.nombre }
      documento = @{ stringValue = $m.cc }
      especialidad = @{ stringValue = $m.especialidad }
      lugarAtencion = @{ stringValue = $m.lugar }
      telefono = @{ stringValue = $m.tel }
    }
  } | ConvertTo-Json -Depth 5

  try {
    $res = Invoke-RestMethod -Uri $urlDoc -Method Patch -Body $body -ContentType "application/json; charset=utf-8"
    Write-Host " [OK] Medico sincronizado: $($m.nombre) ($($m.especialidad))"
  } catch {
    Write-Host " [ERR] Error sincronizando $($m.nombre): $($_.Exception.Message)"
  }
}

Write-Host "`nIniciando carga de Pacientes iniciales a Firebase Firestore..."

$pacientes = @(
  @{
    id="pac-001"; tipoDoc="CC"; doc="6.284.192"; nombre="José Albeiro Montoya Giraldo"; edad=68; sexo="M";
    vereda="Vereda La Guardia"; esp="Urología"; motivo="Sintomatología urinaria obstructiva baja y nicturia"; estado="pendiente"
  },
  @{
    id="pac-002"; tipoDoc="CC"; doc="29.415.883"; nombre="María Ruby Castaño de Ospina"; edad=62; sexo="F";
    vereda="Barrio El Prado (Cabecera)"; esp="Medicina General"; motivo="Dolor epigástrico recurrente y mareo ocasional"; estado="pendiente"
  },
  @{
    id="pac-003"; tipoDoc="TI"; doc="1.114.892.301"; nombre="Samuel David Bedoya Salazar"; edad=7; sexo="M";
    vereda="Corregimiento Albán"; esp="Pediatría"; motivo="Tos nocturna persistente y episodios de sibilancias"; estado="pendiente"
  },
  @{
    id="pac-004"; tipoDoc="CC"; doc="31.890.412"; nombre="Luz Dary Echeverri Cardona"; edad=44; sexo="F";
    vereda="Vereda Boquerón"; esp="Dermatología"; motivo="Lesión hiperpigmentada asimétrica en región malar derecha"; estado="pendiente"
  },
  @{
    id="pac-005"; tipoDoc="CC"; doc="16.402.711"; nombre="Hernando de Jesús Patiño"; edad=74; sexo="M";
    vereda="Vereda Alto Bonito"; esp="Optometría"; motivo="Disminución progresiva de agudeza visual bilateral"; estado="pendiente"
  },
  @{
    id="pac-006"; tipoDoc="RC"; doc="1.114.905.118"; nombre="Luciana Arango Quintero"; edad=4; sexo="F";
    vereda="Resguardo Indígena La Guajira"; esp="Pediatría"; motivo="Bajo peso para la edad y dermatitis en pliegues"; estado="pendiente"
  },
  @{
    id="pac-007"; tipoDoc="CC"; doc="1.112.458.920"; nombre="Luis Fernando Agudelo Marín"; edad=53; sexo="M";
    vereda="Vereda Salmelia"; esp="Fisioterapia"; motivo="Dolor lumbar crónico y limitación funcional para labores agrícolas"; estado="pendiente"
  },
  @{
    id="pac-008"; tipoDoc="CC"; doc="29.418.004"; nombre="Rosa Emilia Zuluaga"; edad=59; sexo="F";
    vereda="Vereda Bellavista"; esp="Odontología"; motivo="Dolor dental agudo en cuadrante superior y necesidad de valoración"; estado="pendiente"
  }
)

foreach ($p in $pacientes) {
  $pId = $p.id
  $urlPac = "$baseUrl/jornada_el_cairo_pacientes/$pId`?key=$apiKey"
  $bodyPac = @{
    fields = @{
      id = @{ stringValue = $p.id }
      tipoDocumento = @{ stringValue = $p.tipoDoc }
      documento = @{ stringValue = $p.doc }
      nombre = @{ stringValue = $p.nombre }
      edad = @{ integerValue = $p.edad }
      sexo = @{ stringValue = $p.sexo }
      veredaBarrio = @{ stringValue = $p.vereda }
      especialidad = @{ stringValue = $p.esp }
      motivoInicial = @{ stringValue = $p.motivo }
      estado = @{ stringValue = $p.estado }
      requiereSeguimiento = @{ booleanValue = $false }
      requiereExamenes = @{ booleanValue = $false }
      requiereRemision = @{ booleanValue = $false }
      detalleDestino = @{ stringValue = "" }
    }
  } | ConvertTo-Json -Depth 5

  try {
    $res = Invoke-RestMethod -Uri $urlPac -Method Patch -Body $bodyPac -ContentType "application/json; charset=utf-8"
    Write-Host " [OK] Paciente sincronizado: $($p.nombre) ($($p.esp))"
  } catch {
    Write-Host " [ERR] Error sincronizando paciente $($p.nombre): $($_.Exception.Message)"
  }
}

Write-Host "`nCarga a Firebase finalizada con exito!"
